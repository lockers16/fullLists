/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DEFAULT_BOOKS } from './data';
import { Book } from './types';
import { StudentView } from './components/StudentView';
import { BookOpen } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);

  // Load books statically from the exported default books
  useEffect(() => {
    setBooks(DEFAULT_BOOKS);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200" dir="rtl">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Branding - Simple Book motif */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 text-white">
              <BookOpen size={26} className="fill-blue-100 stroke-[2.5]" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight font-display">
                <span>ישיבת בנ"ע לפיד מודיעין</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium font-sans">רשימת ספרי לימוד לשנת הלימודים תשפ"ז</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            מערכת הפקת רשימות מותאמות להדפסה
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <StudentView books={books} />
      </main>

      {/* Aesthetic Footer */}
      <footer className="mt-auto py-8 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-center text-slate-450 text-xs transition-colors print:hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold text-slate-500 dark:text-slate-400">© ישיבת בני עקיבא לפיד מודיעין, תשפ"ז - 2026</p>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 bg-emerald-500 rounded-full"></span>
            <span className="font-medium text-slate-400">המידע מנוהל מקומית ואינו נשמר על השרת</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
