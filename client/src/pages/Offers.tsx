import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ExternalLink, Send, CheckCircle, ClipboardList } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import Layout from "@/components/Layout";

interface UnifiedTask {
  id: string;
  type: 'advertiser';
  taskType: string;
  title: string;
  link: string | null;
  rewardAXN: number;
  rewardBUG?: number;
  rewardType: string;
  isAdminTask: boolean;
  isAdvertiserTask?: boolean;
  priority: number;
}

export default function Offers() {
  const queryClient = useQueryClient();
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const { data: tasksData, isLoading } = useQuery<{
    success: boolean;
    tasks: UnifiedTask[];
    completedTaskIds: string[];
  }>({
    queryKey: ['/api/tasks/home/unified'],
    queryFn: async () => {
      const res = await fetch('/api/tasks/home/unified', { credentials: 'include' });
      if (!res.ok) return { success: true, tasks: [], completedTaskIds: [] };
      return res.json();
    },
    retry: false,
  });

  const tasks = tasksData?.tasks || [];
  const serverCompleted = tasksData?.completedTaskIds || [];
  const allCompleted = new Set([...serverCompleted, ...completedTasks]);

  const startMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/advertiser-tasks/${taskId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to start task');
      return data;
    },
    onSuccess: (_, taskId) => {
      setClickedTasks(prev => new Set(prev).add(taskId));
      showNotification("Task started! Click Claim to earn your reward.", "info");
    },
    onError: (e: any) => showNotification(e.message || 'Failed', 'error'),
  });

  const claimMutation = useMutation({
    mutationFn: async ({ taskId, taskType, link }: { taskId: string; taskType: string; link: string | null }) => {
      if (taskType === 'channel' && link) {
        const username = link.replace('https://t.me/', '').split('?')[0];
        const currentTelegramData = (window as any).Telegram?.WebApp?.initData || '';
        const resVerify = await fetch('/api/tasks/verify/channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-data': currentTelegramData },
          body: JSON.stringify({ channelId: `@${username}` }),
          credentials: 'include',
        });
        const verifyData = await resVerify.json();
        if (!resVerify.ok || !verifyData.isJoined) {
          throw new Error('Please join the channel first.');
        }
      }
      const res = await fetch(`/api/advertiser-tasks/${taskId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to claim');
      return data;
    },
    onSuccess: (data, { taskId }) => {
      setCompletedTasks(prev => new Set(prev).add(taskId));
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/home/unified'] });
      const reward = Number(data.reward ?? 0);
      showNotification(`+${reward.toLocaleString()} AXN earned!`, 'success');
    },
    onError: (e: any) => showNotification(e.message || 'Failed', 'error'),
  });

  const handleTask = (task: UnifiedTask) => {
    if (allCompleted.has(task.id)) return;
    if (clickedTasks.has(task.id)) {
      claimMutation.mutate({ taskId: task.id, taskType: task.taskType, link: task.link });
      return;
    }
    if (task.link) window.open(task.link, '_blank');
    startMutation.mutate(task.id);
  };

  const getTaskIcon = (taskType: string) => {
    if (taskType === 'channel') return <Send className="w-4 h-4 text-[#F5C542]" />;
    return <ExternalLink className="w-4 h-4 text-[#F5C542]" />;
  };

  return (
    <Layout>
    <div className="min-h-screen bg-[#000000]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-white/5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 20px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#F5C542]/15 flex items-center justify-center">
            <ClipboardList className="w-4.5 h-4.5 text-[#F5C542]" />
          </div>
          <div>
            <h1 className="text-white font-black text-base uppercase tracking-wider">Offers</h1>
            <p className="text-white/30 text-[11px]">Complete tasks to earn AXN</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#F5C542] animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-3xl bg-[#1c1c1e] flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white/20" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-white/40 font-bold text-sm">No offers available</p>
              <p className="text-white/20 text-xs mt-1">Check back soon for new tasks</p>
            </div>
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = allCompleted.has(task.id);
            const isClicked = clickedTasks.has(task.id);
            const isStartPending = startMutation.isPending && startMutation.variables === task.id;
            const isClaimPending = claimMutation.isPending && claimMutation.variables?.taskId === task.id;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d0d0d] border border-white/5 rounded-2xl px-4 py-3.5 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#1c1c1e] flex items-center justify-center flex-shrink-0">
                  {getTaskIcon(task.taskType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{task.title}</p>
                  <p className="text-[#F5C542]/80 text-[11px] font-black mt-0.5">+{task.rewardAXN.toLocaleString()} AXN</p>
                </div>
                <div className="flex-shrink-0">
                  {isDone ? (
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  ) : isClicked ? (
                    <button
                      onClick={() => handleTask(task)}
                      disabled={isClaimPending}
                      className="h-9 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#F5C542,#d4920a)', color: '#000' }}
                    >
                      {isClaimPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Claim'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTask(task)}
                      disabled={isStartPending}
                      className="h-9 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50"
                      style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {isStartPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Start'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
    </Layout>
  );
}
