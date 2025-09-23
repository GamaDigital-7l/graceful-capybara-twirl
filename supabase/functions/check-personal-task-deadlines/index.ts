import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { addDays, subDays, addHours, subHours, addMinutes, isBefore, isAfter, parseISO } from "https://esm.sh/date-fns@3.6.0"; // Versão atualizada
import { utcToZonedTime, zonedTimeToUtc } from "https://esm.sh/date-fns-tz@3.1.3"; // Versão atualizada, importado zonedTimeToUtc

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// Helper to send Telegram notification
const sendTelegramNotification = async (supabaseAdmin: any, message: string) => {
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("app_settings")
    .select("telegram_bot_token_deadlines, telegram_chat_id_deadlines")
    .eq("id", 1)
    .single();

  if (settingsError) {
    console.error("Error fetching Telegram settings:", settingsError);
    return;
  }

  const { telegram_bot_token_deadlines, telegram_chat_id_deadlines } = settings;

  if (!telegram_bot_token_deadlines || !telegram_chat_id_deadlines) {
    console.warn("Telegram deadline notification settings not configured. Skipping notification.");
    return;
  }

  const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token_deadlines}/sendMessage`;
  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegram_chat_id_deadlines,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Error sending Telegram notification: ${errorData.description}`);
  }
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

    const nowUtc = new Date(); // Current time in UTC
    const nowSaoPaulo = utcToZonedTime(nowUtc, SAO_PAULO_TIMEZONE); // Current time in São Paulo timezone

    // Fetch all uncompleted personal tasks, including reminder_preferences
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("personal_tasks")
      .select("*, reminder_preferences")
      .eq("is_completed", false);

    if (tasksError) throw tasksError;

    const updates = [];

    for (const task of tasks) {
      const reminderPreferences = task.reminder_preferences || [];

      // Combine due_date and due_time into a São Paulo zoned date
      const [year, month, day] = task.due_date.split('-').map(Number);
      const [hours, minutes] = task.due_time ? task.due_time.split(':').map(Number) : [23, 59]; // Default to end of day if no time

      // Create a Date object representing that specific time in São Paulo
      const dateInSaoPaulo = new Date(year, month - 1, day, hours, minutes, 0); // Month is 0-indexed

      // Convert this São Paulo local time to its UTC equivalent
      const fullDueDateTimeUtc = zonedTimeToUtc(dateInSaoPaulo, SAO_PAULO_TIMEZONE);

      // Convert this UTC date back to São Paulo timezone for consistent comparisons
      const fullDueDateTimeSaoPaulo = utcToZonedTime(fullDueDateTimeUtc, SAO_PAULO_TIMEZONE);

      const taskId = task.id;
      const taskTitle = task.title;

      // Helper to check if a notification was recently sent for a specific type
      const wasNotifiedRecently = (lastNotifiedAt: string | null) => {
        if (!lastNotifiedAt) return false;
        const lastNotifiedSaoPaulo = utcToZonedTime(parseISO(lastNotifiedAt), SAO_PAULO_TIMEZONE);
        return isAfter(lastNotifiedSaoPaulo, subMinutes(nowSaoPaulo, 1)); // Notified within the last minute
      };

      // --- Pre-reminders ---
      // 1 day before
      const oneDayBeforeSaoPaulo = subDays(fullDueDateTimeSaoPaulo, 1);
      if (reminderPreferences.includes('1d_before') && isAfter(nowSaoPaulo, oneDayBeforeSaoPaulo) && isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && !wasNotifiedRecently(task.last_notified_1d_before_at)) {
        await sendTelegramNotification(supabaseAdmin, `🗓️ Lembrete: A tarefa pessoal *"${taskTitle}"* vence em menos de 1 dia!`);
        updates.push({ id: taskId, last_notified_1d_before_at: nowUtc.toISOString() });
      }

      // 1 hour before
      const oneHourBeforeSaoPaulo = subHours(fullDueDateTimeSaoPaulo, 1);
      if (reminderPreferences.includes('1h_before') && isAfter(nowSaoPaulo, oneHourBeforeSaoPaulo) && isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && !wasNotifiedRecently(task.last_notified_1h_before_at)) {
        await sendTelegramNotification(supabaseAdmin, `⏰ Lembrete: A tarefa pessoal *"${taskTitle}"* vence em menos de 1 hora!`);
        updates.push({ id: taskId, last_notified_1h_before_at: nowUtc.toISOString() });
      }

      // 30 minutes before
      const thirtyMinutesBeforeSaoPaulo = subMinutes(fullDueDateTimeSaoPaulo, 30);
      if (reminderPreferences.includes('30m_before') && isAfter(nowSaoPaulo, thirtyMinutesBeforeSaoPaulo) && isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && !wasNotifiedRecently(task.last_notified_30m_before_at)) {
        await sendTelegramNotification(supabaseAdmin, `🚨 ALERTA: A tarefa pessoal *"${taskTitle}"* vence em menos de 30 minutos!`);
        updates.push({ id: taskId, last_notified_30m_before_at: nowUtc.toISOString() });
      }

      // 15 minutes before
      const fifteenMinutesBeforeSaoPaulo = subMinutes(fullDueDateTimeSaoPaulo, 15);
      if (reminderPreferences.includes('15m_before') && isAfter(nowSaoPaulo, fifteenMinutesBeforeSaoPaulo) && isBefore(nowSaoPaulo, fullDueDateTimeSaoPaulo) && !wasNotifiedRecently(task.last_notified_15m_before_at)) {
        await sendTelegramNotification(supabaseAdmin, `⚠️ Atenção: A tarefa pessoal *"${taskTitle}"* vence em menos de 15 minutos!`);
        updates.push({ id: taskId, last_notified_15m_before_at: nowUtc.toISOString() });
      }

      // --- At due time reminder ---
      // Check if current time is within a small window around the due time
      const dueTimeWindowStartSaoPaulo = subMinutes(fullDueDateTimeSaoPaulo, 5);
      const dueTimeWindowEndSaoPaulo = addMinutes(fullDueDateTimeSaoPaulo, 5);
      if (reminderPreferences.includes('at_due_time') && isAfter(nowSaoPaulo, dueTimeWindowStartSaoPaulo) && isBefore(nowSaoPaulo, dueTimeWindowEndSaoPaulo) && !wasNotifiedRecently(task.last_notified_at_due_time)) {
        await sendTelegramNotification(supabaseAdmin, `🔔 AGORA: A tarefa pessoal *"${taskTitle}"* está vencendo!`);
        updates.push({ id: taskId, last_notified_at_due_time: nowUtc.toISOString() });
      }

      // --- Post-reminders (if not completed) ---
      // 1 hour after due time
      const oneHourAfterSaoPaulo = addHours(fullDueDateTimeSaoPaulo, 1);
      if (reminderPreferences.includes('1h_after') && isAfter(nowSaoPaulo, oneHourAfterSaoPaulo) && !wasNotifiedRecently(task.last_notified_1h_after_at)) {
        await sendTelegramNotification(supabaseAdmin, `⏳ Atrasado: A tarefa pessoal *"${taskTitle}"* venceu há 1 hora e ainda não foi concluída!`);
        updates.push({ id: taskId, last_notified_1h_after_at: nowUtc.toISOString() });
      }

      // 1 day after due time
      const oneDayAfterSaoPaulo = addDays(fullDueDateTimeSaoPaulo, 1);
      if (reminderPreferences.includes('1d_after') && isAfter(nowSaoPaulo, oneDayAfterSaoPaulo) && !wasNotifiedRecently(task.last_notified_1d_after_at)) {
        await sendTelegramNotification(supabaseAdmin, `🔴 MUITO ATRASADO: A tarefa pessoal *"${taskTitle}"* venceu há 1 dia e ainda não foi concluída!`);
        updates.push({ id: taskId, last_notified_1d_after_at: nowUtc.toISOString() });
      }
    }

    // Batch update tasks with new notification timestamps
    if (updates.length > 0) {
      const { error: updateError } = await supabaseAdmin.from("personal_tasks").upsert(updates);
      if (updateError) console.error("Error updating task notification timestamps:", updateError);
    }

    return new Response(JSON.stringify({ message: `Checked personal task deadlines. Processed ${tasks.length} tasks, sent ${updates.length} notifications.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in check-personal-task-deadlines Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});