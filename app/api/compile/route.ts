import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const { latex } = await req.json()
  if (!latex || typeof latex !== 'string') {
    return NextResponse.json({ error: 'Missing latex field' }, { status: 400 })
  }

  // Write to a temp dir — pdflatex needs a writable working directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-'))
  const texFile = path.join(tmpDir, 'resume.tex')
  const pdfFile = path.join(tmpDir, 'resume.pdf')

  try {
    await fs.writeFile(texFile, latex, 'utf8')

    // Run pdflatex twice so references/TOC resolve (overkill for resumes but harmless)
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texFile}"`
    await execAsync(cmd)
    await execAsync(cmd)

    const pdfBuffer = await fs.readFile(pdfFile)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    // Read the pdflatex log for a useful error message
    let log = ''
    try {
      log = await fs.readFile(path.join(tmpDir, 'resume.log'), 'utf8')
      // Extract just the first error line
      const errorLine = log.split('\n').find((l) => l.startsWith('!'))
      if (errorLine) log = errorLine
    } catch {}
    return NextResponse.json({ error: log || String(err) }, { status: 500 })
  } finally {
    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
