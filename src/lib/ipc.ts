// Type-safe access to the IPC bridge exposed by preload.ts
declare global {
  interface Window {
    api: {
      instructor: {
        list: () => Promise<any[]>
        get: (id: number) => Promise<{ instructor: any; demos: any[] }>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      demo: {
        list: () => Promise<any[]>
        get: (id: number) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
        submitFeedback: (id: number, feedback: any) => Promise<any>
        getUpcoming: () => Promise<any[]>
      }
      client: {
        list: () => Promise<any[]>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      proposal: {
        list: () => Promise<any[]>
        get: (id: number) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
        export: (id: number, format: 'docx' | 'pdf') => Promise<{ outputPath: string }>
        templates: {
          list: () => Promise<any[]>
          create: (data: any) => Promise<any>
          update: (id: number, data: any) => Promise<any>
          delete: (id: number) => Promise<any>
        }
      }
      learner: {
        list: () => Promise<any[]>
        create: (data: any) => Promise<any>
        createBulk: (data: any[]) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      certificate: {
        list: () => Promise<any[]>
        bulkFill: (data: any) => Promise<any>
        previewExcel: (excelPath: string) => Promise<{ headers: string[]; rows: string[][]; sheetName: string; rowCount: number }>
        fillFromExcel: (data: any) => Promise<{ results: any[]; outputDir: string }>
        templates: {
          list: () => Promise<any[]>
          upload: (data: any) => Promise<any>
          delete: (id: number) => Promise<any>
        }
      }
      transcript: {
        list: () => Promise<any[]>
        create: (data: any) => Promise<any>
        bulkFill: (data: any) => Promise<any>
        templates: {
          list: () => Promise<any[]>
          upload: (data: any) => Promise<any>
          delete: (id: number) => Promise<any>
        }
      }
      doxx: {
        list: () => Promise<any[]>
        create: (data: any) => Promise<any>
        updateStatus: (id: number, status: string) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      agent: {
        chat: (message: string) => Promise<any>
        clearHistory: () => Promise<any>
        getHistory: () => Promise<any[]>
      }
      rbc: {
        programs: () => Promise<string[]>
        exportWorkbook: (data: any) => Promise<{ outputPath: string }>
        launch: (exePath: string) => Promise<{ success: boolean; error?: string }>
        openFolder: (folderPath: string) => Promise<{ success: boolean }>
        scanTemplate: (templatePath: string) => Promise<string[]>
        fillTemplates: (data: any) => Promise<{ results: any[]; outputDir: string }>
      }
      shell: {
        openPath: (p: string) => Promise<void>
        showItemInFolder: (p: string) => Promise<void>
      }
      on: (channel: string, cb: (...args: any[]) => void) => () => void
    }
  }
}

export const api = window.api
