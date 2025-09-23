import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { addHours, addMinutes, isBefore, parseISO } from "https://esm.sh/date-fns@3.6.0"; // Versão atualizada
import { utcToZonedTime, zonedTimeToUtc } from "https://esm.sh/date-fns-tz@3.1.3"; // Versão atualizada, importado zonedTimeToUtc

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const nowUtc = new Date(); // Current time in UTC
    const nowSaoPaulo = utcToZonedTime(nowUtc, SAO_PAULO_TIMEZONE); // Current time in São Paulo timezone

    // Fetch settings for deadline-specific Telegram credentials
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("telegram_bot_token_deadlines, telegram_chat_id_deadlines")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;

    const { telegram_bot_token_deadlines, telegram_chat_id_deadlines } = settings;

    // Fetch tasks that are not yet approved or awaiting approval
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        due_time,
        last_notified_2hr_at,
        last_notified_30min_at,
        columns(title),
        groups(workspaces(name))
      `)
      .not("columns.title", "in", '("Aprovado", "Para aprovação")')
      .not("due_date", "is", null); // Only tasks with a due date

    if (tasksError) throw tasksError;

    const notificationsToSend = [];
    const updates = [];

    for (const task of tasks) {
      const columnTitle = (task.columns as { title: string }).title;
      const workspaceName = (task.groups as { workspaces: { name: string } }).workspaces.name;

      // Combine due_date and due_time into a São Paulo zoned date
      const [year, month, day] = task.due_date.split('-').map(Number);
      const [hours, minutes] = task.due_time ? task.due_time.split(':').map(Number) : [23, 59]; // Default to end of day if no time

      // Create a Date object representing that specific time in São Paulo
      const dateInSaoPaulo = new Date(year, month - 1, day, hours, minutes, 0); // Month is 0-indexed

      // Convert this São Paulo local time to its UTC equivalent
      const fullDueDateTimeUtc = zonedTimeToUtc(dateInSaoPaulo, SAO_PAULO_TIMEZONE);

      // Convert this UTC date back to São Paulo timezone for consistent comparisons
      const fullDueDateTimeSaoPaulo = utcToZonedTime(fullDueDateTimeUtc, SAO_PAULO_TIMEZONE);

      // Convert notification thresholds to São Paulo time for comparison
      const twoHoursFromNowSaoPaulo = addHours(nowSaoPaulo, 2);
      const thirtyMinutesFromNowSaoPaulo = addMinutes(nowSaoPaulo, 30);

      // Check for 2-hour notification
      if (
        isBefore(fullDueDateTimeSaoPaulo, twoHoursFromNowSaoPaulo) &&
        isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && // Ensure notification is sent before deadline
        (!task.last_notified_2hr_at || isBefore(utcToZonedTime(parseISO(task.last_notified_2hr_at), SAO_PAULO_TIMEZONE), addHours(nowSaoPaulo, -2))) // Notified more than 2 hours ago
      ) {
        notificationsToSend.push({
          taskId: task.id,
          type: "2hr",
          message: `⏰ Lembrete: A tarefa *"${task.title}"* do workspace *"${workspaceName}"* vence em menos de 2 horas! Status atual: *${columnTitle}*.`,
        });
        updates.push({ id: task.id, last_notified_2hr_at: nowUtc.toISOString() });
      }

      // Check for 30-minute notification
      if (
        isBefore(fullDueDateTimeSaoPaulo, thirtyMinutesFromNowSaoPaulo) &&
        isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && // Ensure notification is sent before deadline
        (!task.last_notified_30min_at || isBefore(utcToZonedTime(parseISO(task.last_notified_30min_at), SAO_PAULO_TIMEZONE), addMinutes(nowSaoPaulo, -30))) // Notified more than 30 minutes ago
      ) {
        notificationsToSend.push({
          taskId: task.id,
          type: "30min",
          message: `🚨 ALERTA: A tarefa *"${task.title}"* do workspace *"${workspaceName}"* vence em menos de 30 minutos! Status atual: *${columnTitle}*.`,
        });
        updates.push({ id: task.id, last_notified_30min_at: nowUtc.toISOString() });
      }
    }

    for (const notification of notificationsToSend) {
      // Send Telegram notification using deadline-specific credentials
      if (telegram_bot_token_deadlines && telegram_chat_id_deadlines) {
        const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token_deadlines}/sendMessage`;
        await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegram_chat_id_deadlines,
            text: notification.message,
            parse_mode: "Markdown",
          }),
        });
      } else {
        console.warn("Telegram deadline notification settings not configured. Skipping notification for task:", notification.taskId);
      }
    }

    // Batch update tasks with new notification timestamps
    if (updates.length > 0) {
      const { error: updateError } = await supabaseAdmin.from("tasks").upsert(updates);
      if (updateError) console.error("Error updating task notification timestamps:", updateError);
    }

    return new Response(JSON.stringify({ message: `Checked deadlines. Sent ${notificationsToSend.length} notifications.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in check-deadlines Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});