import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { format, addHours, addMinutes, isBefore, parseISO } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const twoHoursFromNow = addHours(now, 2);
    const thirtyMinutesFromNow = addMinutes(now, 30);

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

    for (const task of tasks) {
      const columnTitle = (task.columns as { title: string }).title;
      const workspaceName = (task.groups as { workspaces: { name: string } }).workspaces.name;

      // Combine due_date and due_time
      let fullDueDate: Date;
      if (task.due_date && task.due_time) {
        const datePart = format(parseISO(task.due_date), 'yyyy-MM-dd');
        fullDueDate = parseISO(`${datePart}T${task.due_time}`);
      } else if (task.due_date) {
        // If no specific time, assume end of day for notification purposes
        fullDueDate = addHours(parseISO(task.due_date), 23); // 11 PM
        fullDueDate = addMinutes(fullDueDate, 59); // 11:59 PM
      } else {
        continue; // Should not happen due to .not("due_date", "is", null)
      }

      // Check for 2-hour notification
      if (
        isBefore(fullDueDate, twoHoursFromNow) &&
        isBefore(now, fullDueDate) && // Ensure notification is sent before deadline
        (!task.last_notified_2hr_at || isBefore(parseISO(task.last_notified_2hr_at), addHours(now, -2))) // Notified more than 2 hours ago
      ) {
        notificationsToSend.push({
          taskId: task.id,
          type: "2hr",
          message: `⏰ Lembrete: A tarefa *"${task.title}"* do workspace *"${workspaceName}"* vence em menos de 2 horas! Status atual: *${columnTitle}*.`,
        });
      }

      // Check for 30-minute notification
      if (
        isBefore(fullDueDate, thirtyMinutesFromNow) &&
        isBefore(now, fullDueDate) && // Ensure notification is sent before deadline
        (!task.last_notified_30min_at || isBefore(parseISO(task.last_notified_30min_at), addMinutes(now, -30))) // Notified more than 30 minutes ago
      ) {
        notificationsToSend.push({
          taskId: task.id,
          type: "30min",
          message: `🚨 ALERTA: A tarefa *"${task.title}"* do workspace *"${workspaceName}"* vence em menos de 30 minutos! Status atual: *${columnTitle}*.`,
        });
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

      // Update task with last notified timestamp
      const updateField = notification.type === "2hr" ? "last_notified_2hr_at" : "last_notified_30min_at";
      await supabaseAdmin
        .from("tasks")
        .update({ [updateField]: now.toISOString() })
        .eq("id", notification.taskId);
    }

    return new Response(JSON.stringify({ message: `Checked deadlines. Sent ${notificationsToSend.length} notifications.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-deadlines Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});