import files from './course-materials-data.json' with { type: 'json' };

export const materialSource = Object.freeze({
  repository: 'Aspect726/Aspect726.github.io', branch: 'Curriculum',
  commit: '604a82807488885cc5db31f6b1504b27b48076e1',
  url: 'https://github.com/Aspect726/Aspect726.github.io/tree/604a82807488885cc5db31f6b1504b27b48076e1/Nov6/Double_Advanced_Claude',
  note: 'These PDFs retain their original printed dates. Use the course calendar for rescheduled lesson dates.'
});
const base = `https://raw.githubusercontent.com/${materialSource.repository}/${materialSource.commit}/Nov6/Double_Advanced_Claude/`;
const fail = (message, status = 503) => { throw Object.assign(new Error(message), { status }); };
const fileUrl = path => base + path.split('/').map(encodeURIComponent).join('/');
const resource = row => ({ ...row, url: fileUrl(row.path), label: row.path.startsWith('Teacher/') ? 'Teacher guide and answer key' : row.path.endsWith('_Key.pdf') ? 'Grade 5 reference answer key (37 questions)' : row.path.startsWith('Tests/') ? 'Grade 5 reference check (37 questions)' : `Day ${Number(row.path.match(/Day_(\d+)/)?.[1])} worksheet`, type: 'pdf' });
export const diagnostics = files.filter(file => file.path.startsWith('Tests/')).map(resource);
export function weekMaterials(week) {
  if (!Number.isInteger(week) || week < 1 || week > 10) fail('Choose a week from 1 to 10.', 400);
  const number = String(week).padStart(2, '0');
  const worksheets = files.filter(file => file.path.startsWith(`Student/Week_${number}/`)).map(resource);
  const teacherGuide = files.find(file => file.path === `Teacher/Week_${number}_Teacher_Guide.pdf`);
  if (worksheets.length !== 7 || !teacherGuide) fail('This week’s materials are not ready.');
  const notes = week === 4 ? ['Source correction: the Day 27 sheet and Week 4 guide label December 3 as Thanksgiving. Thanksgiving in 2026 is November 26; the website keeps Day 27 as a normal scheduled lesson.'] : [];
  return { worksheets, teacherGuide: resource(teacherGuide), notes, downloadUrl: `/api/v2/teacher/materials/week/${week}.zip` };
}

const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(bytes) { let crc = 0xFFFFFFFF; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; }
function record(length, values) { const bytes = new Uint8Array(length), view = new DataView(bytes.buffer); for (const [offset, value, size] of values) size === 4 ? view.setUint32(offset, value, true) : view.setUint16(offset, value, true); return bytes; }

// PDFs are already compressed. A standard stored ZIP avoids a compression
// dependency and keeps every entry's CRC, length and directory explicit.
export function storedZip(entries) {
  const chunks = [], central = []; let offset = 0, centralLength = 0;
  for (const entry of entries) {
    if (!/^[\w./ -]+$/.test(entry.name) || entry.name.startsWith('/') || entry.name.includes('..')) fail('Invalid archive entry.');
    const name = encoder.encode(entry.name), bytes = entry.bytes, crc = crc32(bytes);
    const local = record(30, [[0, 0x04034b50, 4], [4, 20, 2], [8, 0, 2], [12, 0x0021, 2], [14, crc, 4], [18, bytes.length, 4], [22, bytes.length, 4], [26, name.length, 2]]);
    const directory = record(46, [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [14, 0x0021, 2], [16, crc, 4], [20, bytes.length, 4], [24, bytes.length, 4], [28, name.length, 2], [42, offset, 4]]);
    chunks.push(local, name, bytes); central.push(directory, name); offset += local.length + name.length + bytes.length; centralLength += directory.length + name.length;
  }
  const end = record(22, [[0, 0x06054b50, 4], [8, entries.length, 2], [10, entries.length, 2], [12, centralLength, 4], [16, offset, 4]]);
  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

export async function fetchReviewedPDF(file, fetcher = fetch) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(file.url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok || !response.body) fail('The PDF source could not be reached. Try Download week again, or open the individual PDFs.');
    if (Number(response.headers.get('content-length') || 0) > file.size) fail('The source PDF has changed. Reload the curriculum.');
    const chunks = [], reader = response.body.getReader(); let length = 0;
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > file.size) { await reader.cancel(); fail('The source PDF has changed. Reload the curriculum.'); } chunks.push(value); } }
    finally { reader.releaseLock(); }
    if (length !== file.size) fail('A PDF download was incomplete. Try Download week again.');
    const bytes = new Uint8Array(length); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') fail('The source did not return a PDF.');
    const prefix = encoder.encode(`blob ${length}\0`), hashInput = new Uint8Array(prefix.length + length); hashInput.set(prefix); hashInput.set(bytes, prefix.length);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', hashInput)), n => n.toString(16).padStart(2, '0')).join('');
    if (digest !== file.sha) fail('The source PDF does not match the reviewed curriculum.');
    return bytes;
  } catch (error) { if (error.status) throw error; fail('The PDF source could not be reached. Try Download week again, or open the individual PDFs.'); }
  finally { clearTimeout(timer); }
}

export async function downloadWeek(week, { fetcher = fetch, courseWeek = null } = {}) {
  const material = weekMaterials(week), chosen = [...material.worksheets, material.teacherGuide];
  // Eight known files, approximately 400 KB per week. Never accept a caller URL
  // or fetch the repository ZIP, which includes unrelated/private test inputs.
  if (chosen.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024) fail('This download is too large. Open the individual PDFs instead.');
  const entries = await Promise.all(chosen.map(async file => ({ name: file.path, bytes: await fetchReviewedPDF(file, fetcher) })));
  const calendar = courseWeek?.days?.map(day => `Day ${day.index + 1}: ${day.date} — ${day.title}`).join('\n') || '';
  const readme = `Week ${week} curriculum materials\n\nSeven student worksheets and one teacher guide with answer keys.\n${courseWeek ? `Current course dates: ${courseWeek.startDate} to ${courseWeek.endDate}.\n` : ''}${materialSource.note}\n${material.notes.length ? '\n' + material.notes.join('\n') + '\n' : ''}${calendar ? '\nCurrent lesson calendar\n' + calendar + '\n' : ''}\nSource: ${materialSource.url}\nRevision: ${materialSource.commit}\nThe separate Grade 5 reference PDF has 37 questions. It does not match the 39-question syllabus diagnostic used by the gradebook.\n`;
  entries.push({ name: 'READ-ME.txt', bytes: encoder.encode(readme) });
  const archive = storedZip(entries);
  const suffix = /^\d{4}-\d{2}-\d{2}$/.test(courseWeek?.startDate ?? '') ? `-${courseWeek.startDate}` : '';
  return new Response(archive, { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="Double-Advanced-Week-${String(week).padStart(2, '0')}${suffix}.zip"`, 'content-length': String(archive.size), 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}
