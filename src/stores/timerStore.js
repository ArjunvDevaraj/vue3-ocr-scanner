// store/timeStore.js
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useTimeStore = defineStore('time', () => {
  const tasks = ref(JSON.parse(localStorage.getItem('tasks')) || []);
  const currentTask = ref(null);
  const timer = ref(0);
  const intervalId = ref(null);
  const isPaused = ref(false);

  function startTask(taskName) {
    currentTask.value = {
      name: taskName,
      startTime: Date.now(),
      duration: 0,
      endTime: null,
      status: 'in-progress'
    };
    timer.value = 0;
    isPaused.value = false;
    intervalId.value = setInterval(() => {
      if (currentTask.value && !isPaused.value) {
        timer.value++;
        currentTask.value.duration = timer.value;
      }
    }, 1000);
  }

  function pauseTask() {
    isPaused.value = true;
    if (currentTask.value) {
      currentTask.value.status = 'paused';
    }
  }

  function resumeTask() {
    isPaused.value = false;
    if (currentTask.value) {
      currentTask.value.status = 'in-progress';
    }
  }

  function stopTask() {
    clearInterval(intervalId.value);
    if (currentTask.value) {
      currentTask.value.endTime = Date.now();
      currentTask.value.status = 'completed';
      tasks.value.push(currentTask.value);
      localStorage.setItem('tasks', JSON.stringify(tasks.value));
      currentTask.value = null;
      timer.value = 0;
      isPaused.value = false;
    }
  }

  function reset() {
    currentTask.value = null;
    timer.value = 0;
    clearInterval(intervalId.value);
    isPaused.value = false;
  }

  function clearAllTasks() {
    tasks.value = [];
    localStorage.removeItem('tasks');
  }

  const totalTimeSpent = computed(() =>
    tasks.value.reduce((total, task) => total + (task.duration || 0), 0)
  );

  const taskCount = computed(() => tasks.value.length);

  return {
    tasks,
    currentTask,
    timer,
    isPaused,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    reset,
    clearAllTasks,
    totalTimeSpent,
    taskCount
  };
});
