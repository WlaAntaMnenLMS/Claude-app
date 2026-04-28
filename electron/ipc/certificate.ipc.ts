import { ipcMain, app, BrowserWindow, shell } from 'electron'
import { getDb } from '../services/db.service'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import ExcelJS from 'exceljs'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export function registerCertificateIpc() {
  const db = () => getDb()

  // ─── LEARNERS ────────────────────────────────────────────────────────────────
  ipcMain.handle('learner:list', () =>
    db().prepare('SELECT * FROM learners ORDER BY full_name ASC').all()
  )
  ipcMain.handle('learner:create', (_e, data: any) => {
    const r = db().prepare(`
      INSERT INTO learners (full_name, national_id, email, phone, organization)
      VALUES (@full_name, @national_id, @email, @phone, @organization)
    `).run(data)
    return db().prepare('SELECT * FROM learners WHERE id = ?').get(r.lastInsertRowid)
  })
  ipcMain.handle('learner:createBulk', (_e, rows: any[]) => {
    const stmt = db().prepare(`
      INSERT INTO learners (full_name, national_id, email, phone, organization)
      VALUES (@full_name, @national_id, @email, @phone, @organization)
    `)
    const insertMany = db().transaction((learners: any[]) => learners.map(l => stmt.run(l)))
    return insertMany(rows)
  })
  ipcMain.handle('learner:update', (_e, id: number, data: any) => {
    db().prepare(`
      UPDATE learners SET full_name=@full_name, national_id=@national_id,
        email=@email, phone=@phone, organization=@organization WHERE id=@id
    `).run({ ...data, id })
    return db().prepare('SELECT * FROM learners WHERE id = ?').get(id)
  })
  ipcMain.handle('learner:delete', (_e, id: number) => {
    // Remove linked certificates and transcripts first to avoid FK constraint errors
    db().prepare('DELETE FROM certificates WHERE learner_id = ?').run(id)
    db().prepare('DELETE FROM transcripts WHERE learner_id = ?').run(id)
    db().prepare('DELETE FROM learners WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── CERTIFICATE TEMPLATES ───────────────────────────────────────────────────
  ipcMain.handle('certTemplate:list', () =>
    db().prepare('SELECT * FROM cert_templates ORDER BY name ASC').all()
  )
  ipcMain.handle('certTemplate:upload', async (_e, data: any) => {
    // data: { name, sourcePath }
    const templatesDir = path.join(app.getPath('userData'), 'cert-templates')
    if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true })

    const dest = path.join(templatesDir, `${Date.now()}_${path.basename(data.sourcePath)}`)
    fs.copyFileSync(data.sourcePath, dest)

    // Detect {{variables}} from the docx
    let variables: string[] = []
    try {
      const content = fs.readFileSync(dest, 'binary')
      const zip = new PizZip(content)
      const doc = new Docxtemplater(zip, { delimiters: { start: '{{', end: '}}' } })
      // Extract text and find placeholders
      const text = doc.getZip().file('word/document.xml')?.asText() || ''
      const matches = text.match(/\{\{(\w+)\}\}/g) || []
      variables = [...new Set(matches.map((m: string) => m.slice(2, -2)))]
    } catch {
      // If docxtemplater can't parse, try regex on raw text
      try {
        const raw = fs.readFileSync(dest, 'utf8')
        const matches = raw.match(/\{\{(\w+)\}\}/g) || []
        variables = [...new Set(matches.map((m: string) => m.slice(2, -2)))]
      } catch {}
    }

    const r = db().prepare(`
      INSERT INTO cert_templates (name, docx_path, variables)
      VALUES (@name, @docx_path, @variables)
    `).run({ name: data.name, docx_path: dest, variables: JSON.stringify(variables) })

    return db().prepare('SELECT * FROM cert_templates WHERE id = ?').get(r.lastInsertRowid)
  })
  ipcMain.handle('certTemplate:delete', (_e, id: number) => {
    db().prepare('DELETE FROM cert_templates WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── CERTIFICATES ────────────────────────────────────────────────────────────
  ipcMain.handle('certificate:list', () =>
    db().prepare(`
      SELECT c.*, l.full_name as learner_name, ct.name as template_name
      FROM certificates c
      LEFT JOIN learners l ON c.learner_id = l.id
      LEFT JOIN cert_templates ct ON c.template_id = ct.id
      ORDER BY c.created_at DESC
    `).all()
  )

  ipcMain.handle('certificate:bulkFill', async (event, data: any) => {
    // data: { template_id, learners: [{learner_id, course_name, issue_date, extra_data}] }
    const template = db().prepare('SELECT * FROM cert_templates WHERE id = ?').get(data.template_id) as any
    if (!template) throw new Error('Template not found')

    const outputDir = path.join(app.getPath('documents'), 'LD-Assistant', 'Certificates',
      new Date().toISOString().split('T')[0])
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const results: any[] = []
    const total = data.learners.length

    for (let i = 0; i < total; i++) {
      const item = data.learners[i]
      const learner = db().prepare('SELECT * FROM learners WHERE id = ?').get(item.learner_id) as any

      // Generate cert number
      const certNumber = `CERT-${Date.now()}-${String(i + 1).padStart(3, '0')}`

      // Fill the template
      const templateVars = {
        learner_name: learner?.full_name || item.learner_name || '',
        full_name: learner?.full_name || '',
        national_id: learner?.national_id || '',
        email: learner?.email || '',
        course_name: item.course_name,
        issue_date: item.issue_date,
        cert_number: certNumber,
        ...(item.extra_data || {}),
      }

      const safeName = (learner?.full_name || `learner_${i+1}`).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const outputPath = path.join(outputDir, `${safeName}_certificate.docx`)

      try {
        const content = fs.readFileSync(template.docx_path, 'binary')
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
        doc.render(templateVars)
        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
        fs.writeFileSync(outputPath, buf)

        // Save to DB
        const r = db().prepare(`
          INSERT INTO certificates (template_id, learner_id, course_name, issue_date, cert_number, extra_data, output_path)
          VALUES (@template_id, @learner_id, @course_name, @issue_date, @cert_number, @extra_data, @output_path)
        `).run({
          template_id: data.template_id,
          learner_id: item.learner_id || null,
          course_name: item.course_name,
          issue_date: item.issue_date,
          cert_number: certNumber,
          extra_data: JSON.stringify(item.extra_data || {}),
          output_path: outputPath,
        })

        results.push({ id: r.lastInsertRowid, learner_name: learner?.full_name, outputPath, success: true })
      } catch (err: any) {
        results.push({ learner_name: learner?.full_name, error: err.message, success: false })
      }

      // Send progress to renderer
      const win = BrowserWindow.getFocusedWindow()
      if (win) {
        win.webContents.send('certificate:progress', { current: i + 1, total, outputPath })
      }
    }

    return { results, outputDir }
  })

  // ─── RBC INTEGRATION ─────────────────────────────────────────────────────────

  // Program definitions mirroring RBC Generator
  const RBC_PROGRAMS: Record<string, { modules: string[] }> = {
    'MBA': { modules: ['Strategic Management','Business Finance','General Management','Marketing Management','Human Resource Management','Economics','Project Management','Data Analysis','International Business'] },
    'DBA': { modules: ['Research Methodology','Guide to Business Analysis','Industrial Organization','Research Methods for Business Students','Sustainability and Sustainable Business Practice','Dissertation & Thesis Writing'] },
    'BPD': { modules: ['Mastering Business Psychology',"Human Behavior's Psychology",'Organizational Psychology','Wellbeing and Mental Health','Business Psychology into Practice'] },
    'MBA in BPD': { modules: ['Strategic Management','Business Finance','General Management','Marketing Management','Human Resource Management','Mastering Business Psychology',"Human Behavior's Psychology",'Organizational Psychology','Wellbeing and Mental Health','Business Psychology into Practice'] },
    'MBA in Strategic Major': { modules: ['Strategic Management','Business Finance','General Management','Marketing Management','Human Resource Management','Economics','Project Management','Data Analysis','International Business','Foundations of Strategic Management','Strategic Planning and Execution','Global and Sustainable Strategies','Risk Management and Change Leadership','Strategic Management into Practice'] },
    'Strategic Diploma': { modules: ['Foundations of Strategic Management','Strategic Planning and Execution','Global and Sustainable Strategies','Risk Management and Change Leadership','Strategic Management into Practice'] },
    'Executive Management Diploma': { modules: ['Strategic Management','Business Finance','General Management','Marketing Management','Human Resource Management'] },
    'MBA Old Track': { modules: ['Strategic Management','Business Finance','General Management','Marketing Management','Human Resource Management'] },
    'BPD Old Track': { modules: ['Foundation of Business Psychology','Introduction to Business Psychology','Psychology of People Management','Psychology of Decision Making','Well-being at Workplace','Business Psychology into Practice'] },
  }

  ipcMain.handle('rbc:programs', () => Object.keys(RBC_PROGRAMS))

  ipcMain.handle('rbc:exportWorkbook', async (_e, data: {
    program: string
    learnerIds: number[]
    graduationDate: string
    academicYear: string
    outputDir: string
  }) => {
    const prog = RBC_PROGRAMS[data.program]
    if (!prog) throw new Error(`Unknown program: ${data.program}`)

    const learners = (data.learnerIds.length > 0
      ? (db().prepare(`SELECT * FROM learners WHERE id IN (${data.learnerIds.map(() => '?').join(',')})`)
          .all(...data.learnerIds) as any[])
      : (db().prepare('SELECT * FROM learners').all() as any[])
    )

    // Build headers
    const COMMON = ['Student Name','Email','Reg. No','Phone Number','First Name','Last Name','Academic Year','Date of Birth','Gender','Country of Birth','Citizenship','Graduation Date']
    const moduleHeaders: string[] = []
    for (const mod of prog.modules) {
      moduleHeaders.push(`${mod} Grade`, `${mod} Mark`)
    }
    const headers = [...COMMON, ...moduleHeaders]

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(data.program)

    // Header row — dark blue matching RBC Generator style
    const headerRow = ws.addRow(headers)
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } }
    })
    headerRow.height = 28
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }

    const THIN = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } }
    const border = { left: THIN, right: THIN, top: THIN, bottom: THIN }

    for (const l of learners) {
      const nameParts = (l.full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const rowData: (string | number)[] = [
        l.full_name || '',
        l.email || '',
        l.national_id || '',
        l.phone || '',
        firstName,
        lastName,
        data.academicYear,
        '',  // Date of Birth — fill in Excel
        '',  // Gender
        '',  // Country of Birth
        '',  // Citizenship
        data.graduationDate,
        ...moduleHeaders.map(() => ''),
      ]
      const dataRow = ws.addRow(rowData)
      dataRow.eachCell(cell => {
        cell.border = border
        cell.alignment = { vertical: 'middle', wrapText: true }
      })
    }

    // Auto-width columns
    ws.columns.forEach(col => {
      let max = 12
      col.eachCell?.({ includeEmpty: true }, cell => {
        const len = String(cell.value ?? '').length
        if (len > max) max = len
      })
      col.width = Math.min(max + 4, 42)
    })

    if (!fs.existsSync(data.outputDir)) fs.mkdirSync(data.outputDir, { recursive: true })
    const filename = `RBC_${data.program.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    const outputPath = path.join(data.outputDir, filename)
    await wb.xlsx.writeFile(outputPath)
    return { outputPath }
  })

  ipcMain.handle('rbc:launch', async (_e, exePath: string) => {
    if (!exePath || !fs.existsSync(exePath)) {
      await shell.openPath(path.dirname(exePath || ''))
      return { success: false, error: 'RBC Generator not found at configured path' }
    }
    try {
      spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('rbc:openFolder', async (_e, folderPath: string) => {
    await shell.openPath(folderPath)
    return { success: true }
  })

  // ─── EXCEL → TEMPLATE FILL ──────────────────────────────────────────────────

  ipcMain.handle('certificate:previewExcel', async (_e, excelPath: string) => {
    if (!fs.existsSync(excelPath)) throw new Error('File not found')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(excelPath)
    const ws = wb.worksheets[0]
    const headers: string[] = []
    const rows: string[][] = []

    ws.eachRow((row, i) => {
      if (i === 1) {
        row.eachCell({ includeEmpty: true }, (cell, ci) => { headers[ci - 1] = String(cell.value ?? '') })
      } else if (i <= 4) {
        const r: string[] = []
        row.eachCell({ includeEmpty: true }, (cell, ci) => { r[ci - 1] = String(cell.value ?? '') })
        rows.push(r)
      }
    })
    return { headers, rows, sheetName: ws.name, rowCount: Math.max(0, (ws.rowCount || 1) - 1) }
  })

  ipcMain.handle('certificate:fillFromExcel', async (_e, data: {
    excelPath: string
    templateId: number
    outputDir: string
  }) => {
    if (!fs.existsSync(data.excelPath)) throw new Error('Excel file not found')
    const template = db().prepare('SELECT * FROM cert_templates WHERE id = ?').get(data.templateId) as any
    if (!template) throw new Error('Template not found')

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(data.excelPath)
    const ws = wb.worksheets[0]

    const headers: string[] = []
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, ci) => {
      headers[ci - 1] = String(cell.value ?? '')
    })

    const dataRows: Record<string, string>[] = []
    ws.eachRow((row, i) => {
      if (i === 1) return
      const rd: Record<string, string> = {}
      row.eachCell({ includeEmpty: true }, (cell, ci) => {
        const h = headers[ci - 1]
        if (h) rd[h] = String(cell.value ?? '')
      })
      if (Object.values(rd).some(v => v.trim())) dataRows.push(rd)
    })

    if (!fs.existsSync(data.outputDir)) fs.mkdirSync(data.outputDir, { recursive: true })

    // Detect template type once
    let isChevron = false
    try {
      const zip = new PizZip(fs.readFileSync(template.docx_path))
      outer: for (const fname of Object.keys(zip.files)) {
        if (zip.files[fname].dir) continue
        try {
          const t = zip.file(fname)?.asText() || ''
          if (/<<[^<>]+>>/.test(t) || /«[^«»]+»/.test(t) || /&lt;&lt;[^&]+&gt;&gt;/.test(t)) {
            isChevron = true; break outer
          }
        } catch {}
      }
    } catch {}

    const results: any[] = []
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i]
      const name = rowData['Student Name'] || rowData['Full Name'] || rowData['learner_name'] || `Row_${i + 2}`

      // Build unified variable map: exact headers + snake_case aliases + standard cert fields
      const vars: Record<string, string> = { ...rowData }
      for (const [k, v] of Object.entries(rowData)) {
        const snake = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        if (!vars[snake]) vars[snake] = v
      }
      vars['learner_name']  = vars['learner_name']  || name
      vars['full_name']     = vars['full_name']      || name
      vars['cert_number']   = `CERT-${Date.now()}-${String(i + 1).padStart(3, '0')}`
      vars['issue_date']    = vars['issue_date']     || vars['Graduation Date'] || new Date().toLocaleDateString('en-GB')
      vars['course_name']   = vars['course_name']    || vars['Program'] || vars['Programme'] || ''

      const safeName = name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 40)
      const outputPath = path.join(data.outputDir, `${safeName}.docx`)

      try {
        if (isChevron) {
          const zip = new PizZip(fs.readFileSync(template.docx_path))
          for (const fname of Object.keys(zip.files)) {
            if (zip.files[fname].dir) continue
            try {
              let text = zip.file(fname)?.asText() || ''
              for (const [key, val] of Object.entries(vars)) {
                const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const sv = val.replace(/[&<>"']/g, c =>
                  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c))
                text = text.replace(new RegExp(`<<\\s*${esc}\\s*>>`, 'gi'), sv)
                text = text.replace(new RegExp(`«\\s*${esc}\\s*»`, 'gi'), sv)
                text = text.replace(new RegExp(`&lt;&lt;\\s*${esc}\\s*&gt;&gt;`, 'gi'), sv)
              }
              zip.file(fname, text)
            } catch {}
          }
          fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
        } else {
          const content = fs.readFileSync(template.docx_path, 'binary')
          const zip = new PizZip(content)
          const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
          doc.render(vars)
          fs.writeFileSync(outputPath, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
        }

        const r = db().prepare(`
          INSERT INTO certificates (template_id, learner_id, course_name, issue_date, cert_number, extra_data, output_path)
          VALUES (@template_id, @learner_id, @course_name, @issue_date, @cert_number, @extra_data, @output_path)
        `).run({
          template_id: data.templateId,
          learner_id: null,
          course_name: vars['course_name'] || '',
          issue_date: vars['issue_date']   || '',
          cert_number: vars['cert_number'],
          extra_data: JSON.stringify(rowData),
          output_path: outputPath,
        })
        results.push({ id: r.lastInsertRowid, name, outputPath, success: true })
      } catch (err: any) {
        results.push({ name, error: err.message, success: false })
      }

      const win = BrowserWindow.getFocusedWindow()
      if (win) win.webContents.send('certificate:fillProgress', { current: i + 1, total: dataRows.length })
    }

    return { results, outputDir: data.outputDir }
  })

  // ─── DIRECT TEMPLATE FILL ────────────────────────────────────────────────────

  ipcMain.handle('rbc:scanTemplate', (_e, templatePath: string) => {
    if (!fs.existsSync(templatePath)) throw new Error('Template file not found')
    const content = fs.readFileSync(templatePath)
    const zip = new PizZip(content)
    const found = new Set<string>()

    for (const name of Object.keys(zip.files)) {
      if (!zip.files[name].dir) {
        try {
          const text = zip.file(name)?.asText() || ''
          // Also decode XML entities so &lt;&lt;Field&gt;&gt; is found
          const decoded = text.replace(/&lt;&lt;/g, '<<').replace(/&gt;&gt;/g, '>>')
                              .replace(/«/g, '«').replace(/»/g, '»')
          const p1 = /<<\s*([^<>]+?)\s*>>/g
          const p2 = /«\s*([^«»]+?)\s*»/g
          let m: RegExpExecArray | null
          while ((m = p1.exec(decoded)) !== null) found.add(m[1].trim())
          while ((m = p2.exec(decoded)) !== null) found.add(m[1].trim())
        } catch { /* binary files — skip */ }
      }
    }
    return [...found].sort()
  })

  ipcMain.handle('rbc:fillTemplates', async (_e, data: {
    templatePath: string
    learnerIds: number[]
    graduationDate: string
    academicYear: string
    program: string
    moduleGrades: Record<number, Record<string, { grade: string; mark: string }>>
    outputDir: string
  }) => {
    if (!fs.existsSync(data.templatePath)) throw new Error('Template not found')
    if (!fs.existsSync(data.outputDir)) fs.mkdirSync(data.outputDir, { recursive: true })

    const learners = data.learnerIds.length > 0
      ? (db().prepare(`SELECT * FROM learners WHERE id IN (${data.learnerIds.map(() => '?').join(',')})`)
          .all(...data.learnerIds) as any[])
      : []

    const srcExt = path.extname(data.templatePath).toLowerCase()
    const outExt = srcExt === '.potm' || srcExt === '.pptm' ? '.pptx'
                 : srcExt === '.dotm' || srcExt === '.dotx' ? '.docx'
                 : srcExt

    const results: any[] = []

    for (const learner of learners) {
      const nameParts = (learner.full_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      const grades = (data.moduleGrades || {})[learner.id] || {}

      const vars: Record<string, string> = {
        'Student Name': learner.full_name || '',
        'Full Name': learner.full_name || '',
        'First Name': firstName,
        'Last Name': lastName,
        'Email': learner.email || '',
        'Registration No': learner.national_id || '',
        'Reg. No': learner.national_id || '',
        'National ID': learner.national_id || '',
        'Student Number': learner.national_id || '',
        'Phone Number': learner.phone || '',
        'Phone': learner.phone || '',
        'Academic Year': data.academicYear,
        'Graduation Date': data.graduationDate,
        'Date of Birth': '',
        'Gender': '',
        'Country of Birth': '',
        'Citizenship': '',
        'Organization': learner.organization || '',
        'Program': data.program,
        'Programme': data.program,
      }

      for (const [mod, gm] of Object.entries(grades)) {
        vars[`${mod} Grade`] = gm.grade
        vars[`${mod} Mark`] = gm.mark
        // Also handle short names without program prefix
        const shortMod = mod.replace(/^.*?[- ]/, '')
        if (!vars[`${shortMod} Grade`]) vars[`${shortMod} Grade`] = gm.grade
        if (!vars[`${shortMod} Mark`]) vars[`${shortMod} Mark`] = gm.mark
      }

      const content = fs.readFileSync(data.templatePath)
      const zip = new PizZip(content)

      for (const name of Object.keys(zip.files)) {
        if (zip.files[name].dir) continue
        try {
          let text = zip.file(name)?.asText() || ''
          for (const [key, val] of Object.entries(vars)) {
            const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const safeVal = val.replace(/[&<>"']/g, c =>
              ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
            // Raw chevron syntax
            text = text.replace(new RegExp(`<<\\s*${escaped}\\s*>>`, 'gi'), safeVal)
            text = text.replace(new RegExp(`«\\s*${escaped}\\s*»`, 'gi'), safeVal)
            // XML-entity-encoded chevrons (common when Office re-saves)
            text = text.replace(new RegExp(`&lt;&lt;\\s*${escaped}\\s*&gt;&gt;`, 'gi'), safeVal)
          }
          zip.file(name, text)
        } catch { /* binary entry — skip */ }
      }

      const safeName = (learner.full_name || `learner_${learner.id}`)
        .replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const outputPath = path.join(data.outputDir, `${safeName}${outExt}`)
      fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
      results.push({ learner_id: learner.id, learner_name: learner.full_name, outputPath, success: true })

      const win = BrowserWindow.getFocusedWindow()
      if (win) win.webContents.send('rbc:fillProgress', { current: results.length, total: learners.length })
    }

    return { results, outputDir: data.outputDir }
  })
}
