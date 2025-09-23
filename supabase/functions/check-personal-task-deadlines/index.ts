import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { format, addDays, subDays, addHours, subHours, addMinutes, isBefore, isAfter, isEqual, parseISO, startOfDay, endOfDay } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const now = new Date();
    const nowISO = now.toISOString();

    // Fetch all uncompleted personal tasks, including reminder_preferences
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("personal_tasks")
      .select("*, reminder_preferences")
      .eq("is_completed", false);

    if (tasksError) throw tasksError;

    const updates = [];

    for (const task of tasks) {
      const reminderPreferences = task.reminder_preferences || [];

      let taskDueDate = parseISO(task.due_date);
      let fullDueDateTime: Date;

      if (task.due_time) {
        const [hours, minutes] = task.due_time.split(':').map(Number);
        fullDueDateTime = addHours(addMinutes(taskDueDate, minutes), hours);
      } else {
        // If no specific time, consider it due at the end of the day for reminders
        fullDueDateTime = endOfDay(taskDueDate);
      }

      const taskTitle = task.title;
      const taskId = task.id;

      // --- Pre-reminders ---
      // 1 day before
      const oneDayBefore = subDays(fullDueDateTime, 1);
      if (reminderPreferences.includes('1d_before') && isAfter(now, oneDayBefore) && isBefore(now, fullDueDateTime) && (!task.last_notified_1d_before_at || isBefore(parseISO(task.last_notified_1d_before_at), subHours(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `🗓️ Lembrete: A tarefa pessoal *"${taskTitle}"* vence em menos de 1 dia!`);
        updates.push({ id: taskId, last_notified_1d_before_at: nowISO });
      }

      // 1 hour before
      const oneHourBefore = subHours(fullDueDateTime, 1);
      if (reminderPreferences.includes('1h_before') && isAfter(now, oneHourBefore) && isBefore(now, fullDueDateTime) && (!task.last_notified_1h_before_at || isBefore(parseISO(task.last_notified_1h_before_at), subMinutes(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `⏰ Lembrete: A tarefa pessoal *"${taskTitle}"* vence em menos de 1 hora!`);
        updates.push({ id: taskId, last_notified_1h_before_at: nowISO });
      }

      // 30 minutes before
      const thirtyMinutesBefore = subMinutes(fullDueDateTime, 30);
      if (reminderPreferences.includes('30m_before') && isAfter(now, thirtyMinutesBefore) && isBefore(now, fullDueDateTime) && (!task.last_notified_30m_before_at || isBefore(parseISO(task.last_notified_30m_before_at), subMinutes(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `🚨 ALERTA: A tarefa pessoal *"${taskTitle}"* vence em menos de 30 minutos!`);
        updates.push({ id: taskId, last_notified_30m_before_at: nowISO });
      }

      // 15 minutes before
      const fifteenMinutesBefore = subMinutes(fullDueDateTime, 15);
      if (reminderPreferences.includes('15m_before') && isAfter(now, fifteenMinutesBefore) && isBefore(now, fullDueDateTime) && (!task.last_notified_15m_before_at || isBefore(parseISO(task.last_notified_15m_before_at), subMinutes(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `⚠️ Atenção: A tarefa pessoal *"${taskTitle}"* vence em menos de 15 minutos!`);
        updates.push({ id: taskId, last_notified_15m_before_at: nowISO });
      }

      // --- At due time reminder ---
      // Check if current time is within a small window around the due time
      const dueTimeWindowStart = subMinutes(fullDueDateTime, 5);
      const dueTimeWindowEnd = addMinutes(fullDueDateTime, 5);
      if (reminderPreferences.includes('at_due_time') && isAfter(now, dueTimeWindowStart) && isBefore(now, dueTimeWindowEnd) && (!task.last_notified_at_due_time || isBefore(parseISO(task.last_notified_at_due_time), subMinutes(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `🔔 AGORA: A tarefa pessoal *"${taskTitle}"* está vencendo!`);
        updates.push({ id: taskId, last_notified_at_due_time: nowISO });
      }

      // --- Post-reminders (if not completed) ---
      // 1 hour after due time
      const oneHourAfter = addHours(fullDueDateTime, 1);
      if (reminderPreferences.includes('1h_after') && isAfter(now, oneHourAfter) && (!task.last_notified_1h_after_at || isBefore(parseISO(task.last_notified_1h_after_at), subMinutes(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `⏳ Atrasado: A tarefa pessoal *"${taskTitle}"* venceu há 1 hora e ainda não foi concluída!`);
        updates.push({ id: taskId, last_notified_1h_after_at: nowISO });
      }

      // 1 day after due time
      const oneDayAfter = addDays(fullDueDateTime, 1);
      if (reminderPreferences.includes('1d_after') && isAfter(now, oneDayAfter) && (!task.last_notified_1d_after_at || isBefore(parseISO(task.last_notified_1d_after_at), subHours(now, 1)))) {
        await sendTelegramNotification(supabaseAdmin, `🔴 MUITO ATRASADO: A tarefa pessoal *"${taskTitle}"* venceu há 1 dia e ainda não foi concluída!`);
        updates.push({ id: taskId, last_notified_1d_after_at: nowISO });
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