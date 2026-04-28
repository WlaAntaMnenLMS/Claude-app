import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ── Instructors ──────────────────────────────────────────────────────
  instructor: {
    list:    ()                          => ipcRenderer.invoke('instructor:list'),
    get:     (id: number)                => ipcRenderer.invoke('instructor:get', id),
    create:  (data: any)                 => ipcRenderer.invoke('instructor:create', data),
    update:  (id: number, data: any)     => ipcRenderer.invoke('instructor:update', id, data),
    delete:  (id: number)                => ipcRenderer.invoke('instructor:delete', id),
  },

  // ── Demo sessions ────────────────────────────────────────────────────
  demo: {
    list:           ()                        => ipcRenderer.invoke('demo:list'),
    get:            (id: number)              => ipcRenderer.invoke('demo:get', id),
    create:         (data: any)               => ipcRenderer.invoke('demo:create', data),
    update:         (id: number, data: any)   => ipcRenderer.invoke('demo:update', id, data),
    delete:         (id: number)              => ipcRenderer.invoke('demo:delete', id),
    submitFeedback: (id: number, fb: any)     => ipcRenderer.invoke('demo:submitFeedback', id, fb),
    getUpcoming:    ()                        => ipcRenderer.invoke('demo:getUpcoming'),
  },

  // ── Clients ──────────────────────────────────────────────────────────
  client: {
    list:   ()                        => ipcRenderer.invoke('client:list'),
    create: (data: any)               => ipcRenderer.invoke('client:create', data),
    update: (id: number, data: any)   => ipcRenderer.invoke('client:update', id, data),
    delete: (id: number)              => ipcRenderer.invoke('client:delete', id),
  },

  // ── Proposals ────────────────────────────────────────────────────────
  proposal: {
    list:    ()                        => ipcRenderer.invoke('proposal:list'),
    get:     (id: number)              => ipcRenderer.invoke('proposal:get', id),
    create:  (data: any)               => ipcRenderer.invoke('proposal:create', data),
    update:  (id: number, data: any)   => ipcRenderer.invoke('proposal:update', id, data),
    delete:  (id: number)              => ipcRenderer.invoke('proposal:delete', id),
    export:  (id: number, fmt: string) => ipcRenderer.invoke('proposal:export', id, fmt),
    templates: {
      list:   ()                       => ipcRenderer.invoke('proposalTemplate:list'),
      create: (data: any)              => ipcRenderer.invoke('proposalTemplate:create', data),
      update: (id: number, data: any)  => ipcRenderer.invoke('proposalTemplate:update', id, data),
      delete: (id: number)             => ipcRenderer.invoke('proposalTemplate:delete', id),
    },
  },

  // ── Learners ─────────────────────────────────────────────────────────
  learner: {
    list:       ()            => ipcRenderer.invoke('learner:list'),
    create:     (data: any)   => ipcRenderer.invoke('learner:create', data),
    createBulk: (data: any[]) => ipcRenderer.invoke('learner:createBulk', data),
    update:     (id: number, data: any) => ipcRenderer.invoke('learner:update', id, data),
    delete:     (id: number)  => ipcRenderer.invoke('learner:delete', id),
  },

  // ── Certificates ─────────────────────────────────────────────────────
  certificate: {
    list:          ()                  => ipcRenderer.invoke('certificate:list'),
    bulkFill:      (data: any)         => ipcRenderer.invoke('certificate:bulkFill', data),
    previewExcel:  (p: string)         => ipcRenderer.invoke('certificate:previewExcel', p),
    fillFromExcel: (data: any)         => ipcRenderer.invoke('certificate:fillFromExcel', data),
    templates: {
      list:   ()          => ipcRenderer.invoke('certTemplate:list'),
      upload: (data: any) => ipcRenderer.invoke('certTemplate:upload', data),
      delete: (id: number)=> ipcRenderer.invoke('certTemplate:delete', id),
    },
  },

  // ── Transcripts ──────────────────────────────────────────────────────
  transcript: {
    list:     ()          => ipcRenderer.invoke('transcript:list'),
    create:   (data: any) => ipcRenderer.invoke('transcript:create', data),
    bulkFill: (data: any) => ipcRenderer.invoke('transcript:bulkFill', data),
    templates: {
      list:   ()          => ipcRenderer.invoke('transcriptTemplate:list'),
      upload: (data: any) => ipcRenderer.invoke('transcriptTemplate:upload', data),
      delete: (id: number)=> ipcRenderer.invoke('transcriptTemplate:delete', id),
    },
  },

  // ── Doxx orders ──────────────────────────────────────────────────────
  doxx: {
    list:         ()                         => ipcRenderer.invoke('doxx:list'),
    create:       (data: any)                => ipcRenderer.invoke('doxx:create', data),
    updateStatus: (id: number, s: string)    => ipcRenderer.invoke('doxx:updateStatus', id, s),
    delete:       (id: number)               => ipcRenderer.invoke('doxx:delete', id),
  },

  // ── AI Agent ─────────────────────────────────────────────────────────
  agent: {
    chat:         (msg: string) => ipcRenderer.invoke('agent:chat', msg),
    clearHistory: ()            => ipcRenderer.invoke('agent:clearHistory'),
    getHistory:   ()            => ipcRenderer.invoke('agent:getHistory'),
  },

  // ── Auth / Users ─────────────────────────────────────────────────────
  auth: {
    login:      (email: string, pin: string) => ipcRenderer.invoke('auth:login', email, pin),
    listUsers:  ()                            => ipcRenderer.invoke('auth:listUsers'),
    createUser: (data: any)                  => ipcRenderer.invoke('auth:createUser', data),
    updateUser: (id: number, data: any)      => ipcRenderer.invoke('auth:updateUser', id, data),
    deleteUser: (id: number)                 => ipcRenderer.invoke('auth:deleteUser', id),
  },

  // ── Network ──────────────────────────────────────────────────────────
  network: {
    getSettings:      ()                         => ipcRenderer.invoke('network:getSettings'),
    saveSettings:     (data: any)                => ipcRenderer.invoke('network:saveSettings', data),
    startServer:      (port: number, pin: string)=> ipcRenderer.invoke('network:startServer', port, pin),
    stopServer:       ()                         => ipcRenderer.invoke('network:stopServer'),
    isRunning:        ()                         => ipcRenderer.invoke('network:isRunning'),
    testConnection:   (host: string, port: number) => ipcRenderer.invoke('network:testConnection', host, port),
    getDbPath:        ()                         => ipcRenderer.invoke('network:getDbPath'),
    setDbPath:        (p: string)                => ipcRenderer.invoke('network:setDbPath', p),
    getDefaultDbPath: ()                         => ipcRenderer.invoke('network:getDefaultDbPath'),
  },

  // ── Search ───────────────────────────────────────────────────────────
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },

  // ── Communication templates ──────────────────────────────────────────
  comm: {
    list:        ()                          => ipcRenderer.invoke('comm:list'),
    create:      (data: any)                 => ipcRenderer.invoke('comm:create', data),
    update:      (id: number, data: any)     => ipcRenderer.invoke('comm:update', id, data),
    delete:      (id: number)                => ipcRenderer.invoke('comm:delete', id),
    render:      (id: number, vars: any)     => ipcRenderer.invoke('comm:render', id, vars),
    logSent:     (data: any)                 => ipcRenderer.invoke('comm:logSent', data),
    sentHistory: ()                          => ipcRenderer.invoke('comm:sentHistory'),
  },

  // ── RBC Generator integration ────────────────────────────────────────
  rbc: {
    programs:       ()                   => ipcRenderer.invoke('rbc:programs'),
    exportWorkbook: (data: any)          => ipcRenderer.invoke('rbc:exportWorkbook', data),
    launch:         (exePath: string)    => ipcRenderer.invoke('rbc:launch', exePath),
    openFolder:     (folderPath: string) => ipcRenderer.invoke('rbc:openFolder', folderPath),
    scanTemplate:   (templatePath: string) => ipcRenderer.invoke('rbc:scanTemplate', templatePath),
    fillTemplates:  (data: any)          => ipcRenderer.invoke('rbc:fillTemplates', data),
  },

  // ── Excel export ─────────────────────────────────────────────────────
  export: {
    toExcel:  (module: string) => ipcRenderer.invoke('export:toExcel', module),
    openFile: (filePath: string) => ipcRenderer.invoke('export:openFile', filePath),
  },

  // ── Shell / file system ──────────────────────────────────────────────
  shell: {
    openPath:         (p: string) => ipcRenderer.invoke('shell:openPath', p),
    showItemInFolder: (p: string) => ipcRenderer.invoke('shell:showItemInFolder', p),
  },

  // ── Event listener ───────────────────────────────────────────────────
  on: (channel: string, cb: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => cb(...args))
    return () => ipcRenderer.removeAllListeners(channel)
  },
})
