import { useState, useEffect } from 'react';

const SYSTEM_EVENTS = [
  "PROTOCOL_HANDSHAKE_INITIATED",
  "GRADING_NODE_A4_STABILIZED",
  "NEURAL_LINK_ENCRYPTED",
  "HEAP_ISOLATION_VERIFIED",
  "LATENCY_BUFFER_OPTIMIZED: 4ms",
  "SECURITY_PROTOCOL_v4_ACTIVE",
  "DATABASE_SYNC_SUCCESSFUL",
  "ANOMALY_DETECTION_PASS",
  "COMPILER_OPTIMIZATION_LEVEL_3",
  "GRID_HEARTBEAT_DETECTED",
  "KERNEL_MEM_SYNC_INITIATED",
  "IO_PORT_MAPPING_VERIFIED",
  "UI_THREAD_PRIORITY_BOOSTED",
  "ENCRYPTION_SALT_ROTATED",
  "NODE_REDUNDANCY_CHECK_COMPLETE"
];

export function useKernelEvents() {
  const [logs, setLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), msg: "SYSTEM_BOOT_COMPLETE", type: 'system' },
    { id: 2, time: new Date().toLocaleTimeString(), msg: "PROTOCOL_ESTABLISHED: DEVLAB_OS", type: 'success' }
  ]);

  useEffect(() => {
    // Simulated WebSocket connection
    const interval = setInterval(() => {
      const msg = SYSTEM_EVENTS[Math.floor(Math.random() * SYSTEM_EVENTS.length)];
      setLogs(prev => {
        const next = [...prev, { 
          id: Date.now(), 
          time: new Date().toLocaleTimeString(), 
          msg,
          type: msg.includes('FAIL') || msg.includes('ANOMALY') ? 'error' : 'system'
        }];
        return next.slice(-100); // Keep last 100 logs
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const addLog = (msg, type = 'system') => {
    setLogs(prev => [...prev, {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }].slice(-100));
  };

  return { logs, addLog };
}
