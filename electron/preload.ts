import { contextBridge, ipcRenderer } from 'electron'

// Expose a type-safe IPC bridge to the renderer
contextBridge.exposeInMainWorld('api', {
  // Instructors
  instructor: {
    list:    ()        => ipcRenderer.invoke('instructor:list'),
    get:     (id: number) => ipcRenderer.invoke('instructor:get', id),
    create:  (data: any)  => ipcRenderer.invoke('instructor:create', data),
    update:  (id: number, data: any) => ipcRenderer.invoke('instructor:update', id, data),
    delete:  (id: number) => ipcRenderer.invoke('instructor:delete', id),
  },

  // Demo sessions
  demo: {
    list:           ()           => ipcRenderer.invoke('demo:list'),
    get:            (id: number) => ipcRenderer.invoke('demo:get', id),
    create:         (data: any)  => ipcRenderer.invoke('demo:create', data),
    update:         (id: number, data: any) => ipcRenderer.invoke('demo:update', id, data),
    delete:         (id: number) => ipcRenderer.invoke('demo:delete', id),
    submitFeedback: (id: number, feedback: any) => ipcRenderer.invoke('demo:submitFeedback', id, feedback),
    getUpcoming:    ()           => ipcRenderer.invoke('demo:getUpcoming'),
  },

  // Clients
  client: {
    list:   ()           => ipcRenderer.invoke('client:list'),
    create: (data: any)  => ipcRenderer.invoke('client:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('client:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('client:delete', id),
  },

  // Proposals
  proposal: {
    list:     ()           => ipcRenderer.invoke('proposal:list'),
    get:      (id: number) => ipcRenderer.invoke('proposal:get', id),
    create:   (data: any)  => ipcRenderer.invoke('proposal:create', data),
    update:   (id: number, data: any) => ipcRenderer.invoke('proposal:update', id, data),
    delete:   (id: number) => ipcRenderer.invoke('proposal:delete', id),
    export:   (id: number, format: 'docx' | 'pdf') => ipcRenderer.invoke('proposal:export', id, format),
    templates: {
      list:   ()           => ipcRenderer.invoke('proposalTemplate:list'),
      create: (data: any)  => ipcRenderer.invoke('proposalTemplate:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('proposalTemplate:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('proposalTemplate:delete', id),
    },
  },

  // Learners
  learner: {
    list:         ()           => ipcRenderer.invoke('learner:list'),
    create:       (data: any)  => ipcRenderer.invoke('learner:create', data),
    createBulk:   (data: any[]) => ipcRenderer.invoke('learner:createBulk', data),
    update:       (id: number, data: any) => ipcRenderer.invoke('learner:update', id, data),
    delete:       (id: number) => ipcRenderer.invoke('learner:delete', id),
  },

  // Certificates
  certificate: {
    list:             ()           => ipcRenderer.invoke('certificate:list'),
    bulkFill:         (data: any)  => ipcRenderer.invoke('certificate:bulkFill', data),
    templates: {
      list:           ()           => ipcRenderer.invoke('certTemplate:list'),
      upload:         (data: any)  => ipcRenderer.invoke('certTemplate:upload', data),
      delete:         (id: number) => ipcRenderer.invoke('certTemplate:delete', id),
    },
  },

  // Transcripts
  transcript: {
    list:     ()           => ipcRenderer.invoke('transcript:list'),
    create:   (data: any)  => ipcRenderer.invoke('transcript:create', data),
    bulkFill: (data: any)  => ipcRenderer.invoke('transcript:bulkFill', data),
    templates: {
      list:   ()           => ipcRenderer.invoke('transcriptTemplate:list'),
      upload: (data: any)  => ipcRenderer.invoke('transcriptTemplate:upload', data),
      delete: (id: number) => ipcRenderer.invoke('transcriptTemplate:delete', id),
    },
  },

  // Doxx orders
  doxx: {
    list:         ()           => ipcRenderer.invoke('doxx:list'),
    create:       (data: any)  => ipcRenderer.invoke('doxx:create', data),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('doxx:updateStatus', id, status),
    delete:       (id: number) => ipcRenderer.invoke('doxx:delete', id),
  },

  // AI Agent
  agent: {
    chat:        (message: string) => ipcRenderer.invoke('agent:chat', message),
    clearHistory: ()               => ipcRenderer.invoke('agent:clearHistory'),
    getHistory:  ()                => ipcRenderer.invoke('agent:getHistory'),
  },

  // Shell / file system
  shell: {
    openPath:          (p: string) => ipcRenderer.invoke('shell:openPath', p),
    showItemInFolder:  (p: string) => ipcRenderer.invoke('shell:showItemInFolder', p),
  },

  // Listen for progress events from main
  on: (channel: string, cb: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => cb(...args))
    return () => ipcRenderer.removeAllListeners(channel)
  },
})
