import { useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { BULK_BATCH_QUESTIONS } from '@/lib/constants';
import { QUESTION_TEMPLATE_CSV, validateImportRows, type ImportRowResult } from '@/lib/questionImport';
import { cn, errorMessage } from '@/lib/utils';
import { getTest } from '@/services/testService';
import { listQuestions, writeQuestionBatch } from '@/services/questionService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

export function AdminBulkUploadPage() {
  const { testId = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRowResult[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const testQuery = useQuery({ queryKey: ['test', testId], queryFn: () => getTest(testId), enabled: Boolean(testId) });

  const importMutation = useMutation({
    mutationFn: async (valid: ImportRowResult[]) => {
      const existing = await listQuestions(testId);
      const entries = valid.flatMap((row) => (row.entry ? [{ ...row.entry, order: 0 }] : []));
      const total = entries.length;
      setProgress({ done: 0, total });
      for (let start = 0; start < total; start += BULK_BATCH_QUESTIONS) {
        const chunk = entries
          .slice(start, start + BULK_BATCH_QUESTIONS)
          .map((entry, index) => ({ ...entry, order: existing.length + start + index + 1 }));
        await writeQuestionBatch(testId, chunk);
        setProgress({ done: Math.min(start + chunk.length, total), total });
      }
      return total;
    },
    onSuccess: (count) => {
      toast.success(`${count} questions imported`, 'They are now part of this test.');
      setRows(null);
      setFileName('');
      void queryClient.invalidateQueries({ queryKey: ['questions', testId] });
      void queryClient.invalidateQueries({ queryKey: ['answer-keys', testId] });
      void queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
    onError: (error) => {
      toast.error('Import stopped', `${errorMessage(error, 'Please try again.')} Questions saved before the failure remain in the test.`);
      void queryClient.invalidateQueries({ queryKey: ['questions', testId] });
    },
    onSettled: () => setProgress(null),
  });

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setParsing(true);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const rawRows = isCsv ? parseCsv(await file.text()) : await parseWorkbook(await file.arrayBuffer());
      if (rawRows.length === 0) {
        toast.error('No rows found', 'The file needs a header row and at least one question.');
        setRows(null);
      } else {
        setFileName(file.name);
        setRows(validateImportRows(rawRows));
      }
    } catch (error) {
      toast.error('Could not read file', errorMessage(error, 'Use a .csv, .xlsx or .xls file.'));
      setRows(null);
    } finally {
      setParsing(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([QUESTION_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quantaprep-questions-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const invalidCount = rows?.filter((row) => row.errors.length > 0).length ?? 0;
  const validRows = rows?.filter((row) => row.entry) ?? [];
  const canImport = Boolean(rows) && invalidCount === 0 && validRows.length > 0 && !importMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={testQuery.data?.title ?? 'Bulk upload'}
        title="Bulk upload questions"
        description="Upload a CSV or Excel file, review every row, then confirm. Nothing is saved until you confirm."
        actions={
          <Link to={`/admin/tests/${testId}/questions`}>
            <Button variant="outline">Back to questions</Button>
          </Link>
        }
      />

      <section className="surface space-y-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">1. Get the template</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Columns: section, question, question_type, option_a, option_b, option_c, option_d, correct_answer, tolerance, explanation, topic, marks, negative_marks. The question_type and correct_answer columns support all 6 question types.
            </p>
          </div>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>
            Download template
          </Button>
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">2. Choose your file</h2>
          <label
            className={cn(
              'mt-3 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-primary-400 hover:bg-primary-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-primary-600',
              parsing && 'pointer-events-none opacity-60',
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <FileSpreadsheet className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {parsing ? 'Reading file...' : fileName ? `Selected: ${fileName}` : 'Click to choose a CSV or Excel file'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">.csv, .xlsx or .xls</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={(event) => void handleFile(event)}
              aria-label="Choose questions file"
            />
          </label>
        </div>
      </section>

      {rows && (
        <section className="surface space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">3. Review the preview</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="success">{validRows.length} valid</Badge>
                <Badge tone={invalidCount ? 'error' : 'neutral'}>{invalidCount} with errors</Badge>
              </div>
            </div>
            <Button onClick={() => importMutation.mutate(validRows)} disabled={!canImport} loading={importMutation.isPending} icon={<Upload className="h-4 w-4" />}>
              Import {validRows.length} question{validRows.length === 1 ? '' : 's'}
            </Button>
          </div>

          {invalidCount > 0 && (
            <p className="rounded-xl bg-error-50 p-4 text-sm text-error-700 dark:bg-error-600/15 dark:text-error-500">
              Fix the rows marked with errors in your file and upload it again. Import is blocked until every row is valid.
            </p>
          )}

          {progress && (
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Saving in batches of {BULK_BATCH_QUESTIONS}</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Row</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Answer</th>
                  <th className="px-4 py-3 font-semibold">Marks</th>
                  <th className="px-4 py-3 font-semibold">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.rowNumber} className={row.errors.length ? 'bg-error-50/60 dark:bg-error-600/10' : ''}>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.rowNumber}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.preview.section || '-'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-800 dark:text-slate-200">{row.preview.question || '-'}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.preview.type || '-'}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.preview.correct || '-'}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.preview.marks}</td>
                    <td className="px-4 py-3">
                      {row.errors.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-accent-700 dark:text-accent-400"><CheckCircle2 className="h-4 w-4" aria-hidden /> OK</span>
                      ) : (
                        <ul className="list-disc space-y-0.5 pl-4 text-error-600 dark:text-error-500">
                          {row.errors.map((error) => <li key={error}>{error}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {testQuery.isError && <ErrorState onRetry={() => void testQuery.refetch()} />}
      {testQuery.isLoading && <Skeleton className="h-20" />}
      {testQuery.data === null && <EmptyState icon={FileSpreadsheet} title="Test not found" description="Go back and pick a test from the list." />}
    </div>
  );
}

function parseCsv(text: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy' });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
}
