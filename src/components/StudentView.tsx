/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, GradeLevel } from '../types';
import { BookOpen, Printer, Trash2, RotateCcw, Info, AlertTriangle } from 'lucide-react';

interface StudentViewProps {
  books: Book[];
}

interface DisplayItem {
  uniqueId: string;       // Unique ID for React key and deletion
  book: Book;             // Original book reference
  displaySubject: string; // The formatted subject header (e.g. "היסטוריה (י'5)")
  section: 'regular' | 'math_english' | 'majors'; // Section grouping
}

// Order of regular subjects
const REGULAR_SUBJECTS_ORDER = [
  'גמרא',
  'תושב"ע',
  'משנה',
  'הלכה',
  'תנ"ך',
  'מחשבת ישראל',
  'ספרות',
  'לשון',
  'אזרחות',
  'גיאוגרפיה',
  'היסטוריה',
  'מדעים',
  'עתודה',
  'מגמות' // For Grade ט, 'מגמות' is listed as a regular subject
];

// Order of English streams (descending)
const ENGLISH_STREAMS_ORDER = [
  'דוברי אנגלית',
  '5 יח"ל - מואץ',
  '5 יח"ל',
  '4 יח"ל',
  '3-4 יח"ל',
  '3 יח"ל',
  'א',
  'ב',
  "ג' - יעל",
  "ג' - מימי",
  "ג'"
];

// Order of Math streams (descending)
const MATH_STREAMS_ORDER = [
  'האצה',
  '5 יח"ל',
  '4 יח"ל',
  '3 יח"ל',
  'א',
  "א'1",
  "א'2",
  'ב',
  'כיתת חינוך מיוחד / תקשורת',
  'לא בהאצה'
];

// Major subjects (Grades י, י"א, י"ב)
const MAJOR_SUBJECTS = [
  'מדעי המחשב',
  'פיזיקה',
  'ביולוגיה',
  'ניהול עסקי',
  'משפטים',
  'מוזיקה',
  'תקשורת',
  'ערבית',
  'אלקטרוניקה',
  'כימיה'
];

// Helper to format class number to school-style string
function formatSingleClassName(grade: string, num: number): string {
  if (grade === 'י"א' || grade === 'י"ב') {
    return `${grade}${num}`;
  }
  return `${grade}'${num}`;
}

// Helper to format a list of class numbers into contiguous Hebrew ranges
function formatClassNumbersString(classes: number[]): string {
  if (classes.length === 0) return '';
  const sorted = [...classes].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      if (start === prev) {
        ranges.push(`${start}`);
      } else if (prev === start + 1) {
        ranges.push(`${start}, ${prev}`);
      } else {
        ranges.push(`${start}–${prev}`); // en-dash
      }
      if (i < sorted.length) {
        start = sorted[i];
        prev = sorted[i];
      }
    }
  }
  return ranges.join(', ');
}

// Helper to format class ranges with grade prefixes (e.g. י'1 – י'4)
function formatClassListForSuffix(grade: string, classes: number[]): string {
  const sorted = [...classes].sort((a, b) => a - b);
  const prefix = (grade === 'י"א' || grade === 'י"ב') ? grade : `${grade}'`;
  
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      if (start === prev) {
        ranges.push(`${prefix}${start}`);
      } else if (prev === start + 1) {
        ranges.push(`${prefix}${start}, ${prefix}${prev}`);
      } else {
        ranges.push(`${prefix}${start} – ${prefix}${prev}`); // en-dash
      }
      if (i < sorted.length) {
        start = sorted[i];
        prev = sorted[i];
      }
    }
  }
  return ranges.join(', ');
}

// Get the display order rank for subject headers
function getSubjectSortIndex(subjectKey: string): number {
  // Extract clean subject name by removing parentheses/class qualifiers
  const cleanSubject = subjectKey.split(' ')[0];
  
  if (cleanSubject === 'מתמטיקה') return 100;
  if (cleanSubject === 'אנגלית') return 101;
  
  const majorIndex = MAJOR_SUBJECTS.indexOf(cleanSubject);
  if (majorIndex !== -1) {
    return 200 + majorIndex;
  }
  
  const regularIndex = REGULAR_SUBJECTS_ORDER.indexOf(cleanSubject);
  return regularIndex !== -1 ? regularIndex : 500;
}

// Get stream sorting index for English books
function getEnglishSortIndex(book: Book): number {
  let bestIndex = 999;
  
  // Check associations
  if (book.associations) {
    book.associations.forEach(assoc => {
      if (assoc.subjectType === 'אנגלית' && assoc.stream) {
        const idx = ENGLISH_STREAMS_ORDER.indexOf(assoc.stream);
        if (idx !== -1 && idx < bestIndex) bestIndex = idx;
      }
    });
  }
  
  // Check legacy fields
  if (book.english) {
    book.english.forEach(stream => {
      const idx = ENGLISH_STREAMS_ORDER.indexOf(stream);
      if (idx !== -1 && idx < bestIndex) bestIndex = idx;
    });
  }
  
  return bestIndex;
}

// Get stream sorting index for Mathematics books
function getMathSortIndex(book: Book): number {
  let bestIndex = 999;
  
  // Check associations
  if (book.associations) {
    book.associations.forEach(assoc => {
      if (assoc.subjectType === 'מתמטיקה' && assoc.stream) {
        const idx = MATH_STREAMS_ORDER.indexOf(assoc.stream);
        if (idx !== -1 && idx < bestIndex) bestIndex = idx;
      }
    });
  }
  
  // Check legacy fields
  if (book.math) {
    book.math.forEach(stream => {
      const idx = MATH_STREAMS_ORDER.indexOf(stream);
      if (idx !== -1 && idx < bestIndex) bestIndex = idx;
    });
  }
  
  return bestIndex;
}

const GRADE_CLASS_NOTICES: Record<string, string> = {
  'ז': "ז'1 - ז'3, ז'7 – תלמוד, ז'4 - ז'5 – צורבא",
  'ח': "ח'1 - ח'3, ח'7 - תלמוד, ח'4 - ח'5 – צורבא",
  'ט': "ט'1 - ט'5 – תושב\"ע / תלמוד / צורבא",
  'י': "י'1 – תושב\"ע, י'2 – י'5, י'7 – תלמוד / צורבא",
  'י"א': "י\"א1 – תושב\"ע, י\"א2 - י\"א5 – תלמוד / צורבא",
  'י"ב': "י\"ב1 – תושב\"ע, י\"ב2 - י\"ב5 – צורבא",
};

export function StudentView({ books }: StudentViewProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | ''>('');
  const [classMode, setClassMode] = useState<'other' | '6' | ''>('');
  const [displayedItems, setDisplayedItems] = useState<DisplayItem[]>([]);
  const [hasDeletions, setHasDeletions] = useState<boolean>(false);
  const [printError, setPrintError] = useState<boolean>(false);

  // Define active classes for a selected grade
  const getActiveOtherClasses = (grade: GradeLevel): number[] => {
    if (['ז', 'ח', 'י'].includes(grade)) {
      return [1, 2, 3, 4, 5, 7];
    }
    return [1, 2, 3, 4, 5]; // ט, י"א, י"ב
  };

  // Helper to determine if a book applies to a specific class in a grade
  const bookAppliesToClass = (book: Book, grade: GradeLevel, classNum: number): boolean => {
    let targetClass = classNum;
    
    // Rule for Grade י"ב: Classes 2 to 5 get identical books to classes 3 and 5.
    // This rule is only applied to Gemara (גמרא) books.
    // If we're looking at classes 2, 3, 4, 5 of Grade י"ב, we treat any Gemara book associated with any of [2, 3, 4, 5] as matching.
    const isYudBetAndMiddleClass = (grade === 'י"ב' && [2, 3, 4, 5].includes(classNum) && book.subject === 'גמרא');
    
    const checkClassMatch = (definedClasses: number[] | undefined, singleClass: number | undefined): boolean => {
      if (isYudBetAndMiddleClass) {
        // If it applies to all classes
        if (!definedClasses || definedClasses.length === 0) {
          if (singleClass === undefined || singleClass === 0) return true;
        }
        // If specific classes are defined, check for any overlap with [2, 3, 4, 5]
        if (definedClasses && definedClasses.length > 0) {
          return definedClasses.some(c => [2, 3, 4, 5].includes(c));
        }
        if (singleClass !== undefined && singleClass !== 0) {
          return [2, 3, 4, 5].includes(singleClass);
        }
        return false;
      } else {
        // Normal matching
        if (!definedClasses || definedClasses.length === 0) {
          if (singleClass === undefined || singleClass === 0) return true;
        }
        if (definedClasses && definedClasses.length > 0) {
          return definedClasses.includes(targetClass);
        }
        if (singleClass !== undefined && singleClass !== 0) {
          return singleClass === targetClass;
        }
        return true;
      }
    };

    // 1. Check associations
    if (book.associations && book.associations.length > 0) {
      return book.associations.some(assoc => {
        if (assoc.grade !== grade) return false;
        return checkClassMatch(assoc.classNumbers, assoc.classNumber);
      });
    }

    // 2. Check legacy fields
    if (book.grades && book.grades.length > 0) {
      if (!book.grades.includes(grade)) return false;
      return checkClassMatch(book.classes, undefined);
    }

    return true;
  };

  // Build the list of books to display when selection changes
  useEffect(() => {
    if (!selectedGrade || !classMode) {
      setDisplayedItems([]);
      setHasDeletions(false);
      return;
    }

    const items: DisplayItem[] = [];

    // Filter all books that target the selected grade
    const gradeBooksFiltered = books.filter(book => {
      const hasGradeAssoc = book.associations?.some(assoc => assoc.grade === selectedGrade);
      const hasLegacyGrade = book.grades?.includes(selectedGrade);
      return hasGradeAssoc || hasLegacyGrade;
    });

    // Create the English dictionary virtual book required for all levels
    const englishDictionaryBook: Book = {
      id: 'english_dict',
      title: 'מילון אנגלי-עברי עברי-אנגלי (אוקספורד/מורפיקס) או מילונית אלקטרונית מאושרת',
      subject: 'אנגלית',
      author: 'הוצאות שונות / דגמים מאושרים ע"י משרד החינוך',
      isMandatory: true,
      grades: ['ז', 'ח', 'ט', 'י', 'י"א', 'י"ב'],
      classes: [],
      english: [],
      math: [],
      majors: [],
      bookType: 'ספר לימוד / קריאה',
      notes: 'נדרש לכלל התלמידים בכל ההקבצות והרמות לשימוש שוטף ובבחינות הבגרות'
    };

    const gradeBooks = [...gradeBooksFiltered, englishDictionaryBook];

    if (classMode === '6') {
      // CLASS 6 ONLY MODE
      gradeBooks.forEach(book => {
        // Verify if book applies to Class 6
        const applies = bookAppliesToClass(book, selectedGrade, 6);
        if (!applies) return;

        let section: 'regular' | 'math_english' | 'majors' = 'regular';
        let displaySubject = book.subject;

        if (['מתמטיקה', 'אנגלית'].includes(book.subject)) {
          section = 'math_english';
        } else if (MAJOR_SUBJECTS.includes(book.subject) && ['י', 'י"א', 'י"ב'].includes(selectedGrade)) {
          section = 'majors';
        }

        items.push({
          uniqueId: `${book.id}_6_${displaySubject}`,
          book,
          displaySubject,
          section
        });
      });
    } else {
      // ALL OTHER CLASSES MODE (Classes 1-5, and 7 if applicable)
      const otherClassesList = getActiveOtherClasses(selectedGrade);

      // Group subjects by their nature
      const subjectsInGrade = Array.from(new Set(gradeBooks.map(b => b.subject)));

      subjectsInGrade.forEach(subjectName => {
        const subjectBooks = gradeBooks.filter(b => b.subject === subjectName);

        if (['מתמטיקה', 'אנגלית'].includes(subjectName)) {
          // Mathematics and English - show all groups in descending order, no splitting
          subjectBooks.forEach(book => {
            // Must apply to at least one other class
            const appliesToAny = otherClassesList.some(c => bookAppliesToClass(book, selectedGrade, c));
            if (!appliesToAny) return;

            items.push({
              uniqueId: `${book.id}_other_${subjectName}`,
              book,
              displaySubject: subjectName,
              section: 'math_english'
            });
          });
        } else if (MAJOR_SUBJECTS.includes(subjectName) && ['י', 'י"א', 'י"ב'].includes(selectedGrade)) {
          // Major subjects - show all available books, no splitting
          subjectBooks.forEach(book => {
            const appliesToAny = otherClassesList.some(c => bookAppliesToClass(book, selectedGrade, c));
            if (!appliesToAny) return;

            items.push({
              uniqueId: `${book.id}_other_${subjectName}`,
              book,
              displaySubject: subjectName,
              section: 'majors'
            });
          });
        } else {
          // Regular subjects: גמרא, תנ"ך, היסטוריה etc. (And 'מגמות' in Grade ט)
          // Group classes by the set of books they require for this subject
          const classGroups: { classes: number[]; books: Book[] }[] = [];

          otherClassesList.forEach(c => {
            const booksForClass = subjectBooks.filter(book => bookAppliesToClass(book, selectedGrade, c));
            if (booksForClass.length === 0) return;

            // Check if there is an existing group with the exact same books
            const existingGroup = classGroups.find(group => {
              if (group.books.length !== booksForClass.length) return false;
              const groupBookIds = group.books.map(b => b.id).sort();
              const classBookIds = booksForClass.map(b => b.id).sort();
              return groupBookIds.every((id, idx) => id === classBookIds[idx]);
            });

            if (existingGroup) {
              existingGroup.classes.push(c);
            } else {
              classGroups.push({ classes: [c], books: booksForClass });
            }
          });

          // Create display items for each class group
          classGroups.forEach(group => {
            const isAllOtherClasses = group.classes.length === otherClassesList.length;
            
            // Format the subject header. If it's for all classes in this view, no class suffix.
            // Otherwise, append the Hebrew class suffix, e.g., "(י'1 – י'4)" or "(י'5)".
            const displaySubject = isAllOtherClasses 
              ? subjectName 
              : `${subjectName} (${formatClassListForSuffix(selectedGrade, group.classes)})`;

            group.books.forEach(book => {
              items.push({
                uniqueId: `${book.id}_group_${group.classes.join('-')}_${displaySubject}`,
                book,
                displaySubject,
                section: 'regular'
              });
            });
          });
        }
      });
    }

    // Sort display items so English & Math books are ordered by stream descendingly
    const sortedItems = items.sort((a, b) => {
      // First, sort by section
      if (a.section !== b.section) {
        const order = { regular: 1, math_english: 2, majors: 3 };
        return order[a.section] - order[b.section];
      }

      // Next, sort by subject header order
      const subAIndex = getSubjectSortIndex(a.displaySubject);
      const subBIndex = getSubjectSortIndex(b.displaySubject);
      if (subAIndex !== subBIndex) {
        return subAIndex - subBIndex;
      }

      // If they are under the same subject, check if it's Math/English to sort descendingly by stream
      if (a.book.subject === 'אנגלית') {
        if (a.book.id === 'english_dict' && b.book.id === 'english_dict') return 0;
        if (a.book.id === 'english_dict') return -1;
        if (b.book.id === 'english_dict') return 1;
        const strA = getEnglishSortIndex(a.book);
        const strB = getEnglishSortIndex(b.book);
        if (strA !== strB) return strA - strB;
      }

      if (a.book.subject === 'מתמטיקה') {
        const strA = getMathSortIndex(a.book);
        const strB = getMathSortIndex(b.book);
        if (strA !== strB) return strA - strB;
      }

      // Fallback internal order or alphabetical
      const ordA = a.book.order !== undefined ? a.book.order : 1000;
      const ordB = b.book.order !== undefined ? b.book.order : 1000;
      if (ordA !== ordB) return ordA - ordB;
      return a.book.title.localeCompare(b.book.title);
    });

    setDisplayedItems(sortedItems);
    setHasDeletions(false);
  }, [selectedGrade, classMode, books]);

  // Handle single textbook deletion from the generated view list
  const handleDeleteItem = (uniqueId: string) => {
    setDisplayedItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
    setHasDeletions(true);
  };

  // Restore the original generated list of books for the selected options
  const handleRestoreOriginal = () => {
    // Setting selections to trigger the useEffect re-evaluation
    const g = selectedGrade;
    const m = classMode;
    setSelectedGrade('');
    setClassMode('');
    setTimeout(() => {
      setSelectedGrade(g);
      setClassMode(m);
    }, 50);
  };

  // Reset entire workflow
  const handleResetSelections = () => {
    setSelectedGrade('');
    setClassMode('');
    setDisplayedItems([]);
    setHasDeletions(false);
  };

  // Generate the formatted Hebrew page title
  const getGeneratedTitle = (): string => {
    if (!selectedGrade || !classMode) return '';
    if (classMode === '6') {
      return `רשימת ספרי לימוד תשפ"ז – כיתה ${formatSingleClassName(selectedGrade, 6)}`;
    }
    const otherClassesList = getActiveOtherClasses(selectedGrade);
    const rangeStr = formatClassNumbersString(otherClassesList);
    const gradePart = (selectedGrade === 'י"א' || selectedGrade === 'י"ב') ? selectedGrade : `${selectedGrade}'`;
    return `רשימת ספרי לימוד תשפ"ז – כיתות ${gradePart} ${rangeStr}`;
  };

  const generatedTitle = getGeneratedTitle();

  // Printable HTML generator
  const generateDocumentHtml = () => {
    const headerTitle = getGeneratedTitle();
    
    // Group display items by their displaySubject
    const grouped: Record<string, { section: string; items: DisplayItem[] }> = {};
    displayedItems.forEach(item => {
      if (!grouped[item.displaySubject]) {
        grouped[item.displaySubject] = { section: item.section, items: [] };
      }
      grouped[item.displaySubject].items.push(item);
    });

    // We sort the subjects
    const sortedSubjects = Object.keys(grouped).sort((a, b) => getSubjectSortIndex(a) - getSubjectSortIndex(b));

    const showMathEnglishHeading = displayedItems.some(item => item.section === 'math_english');
    const showMajorsHeading = displayedItems.some(item => item.section === 'majors');

    let tableBodyHtml = '';
    let currentSection: 'regular' | 'math_english' | 'majors' | null = null;

    sortedSubjects.forEach(subjectHeader => {
      const { section, items } = grouped[subjectHeader];

      // Add major section headers in print output
      if (section === 'math_english' && currentSection !== 'math_english') {
        currentSection = 'math_english';
        tableBodyHtml += `
          <tr style="background-color: #1e3a8a; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <td colspan="2" style="padding: 16px; border: 1px solid #cbd5e1; text-align: right; font-size: 17px; font-weight: 800; font-family: 'Assistant', sans-serif;">
              מתמטיקה ואנגלית
            </td>
          </tr>
        `;
      } else if (section === 'majors' && currentSection !== 'majors') {
        currentSection = 'majors';
        tableBodyHtml += `
          <tr style="background-color: #1e3a8a; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <td colspan="2" style="padding: 16px; border: 1px solid #cbd5e1; text-align: right; font-size: 17px; font-weight: 800; font-family: 'Assistant', sans-serif;">
              מגמות
            </td>
          </tr>
        `;
      }

      // Print subject row
      tableBodyHtml += `
        <tr style="background-color: #eff6ff; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <td colspan="2" style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; direction: rtl; font-size: 14px; font-weight: bold; color: #1e40af; font-family: 'Assistant', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            ${subjectHeader}
          </td>
        </tr>
      `;

      items.forEach((item, idx) => {
        const book = item.book;
        const bType = book.bookType || 'ספר לימוד / קריאה';
        let typeStyle = 'color: #475569;';
        if (bType === 'חוברת עבודה') {
          typeStyle = 'color: #1d4ed8; font-weight: bold; background-color: #eff6ff;';
        } else if (bType === 'לא בהשאלת הספרים') {
          typeStyle = 'color: #991b1b; font-weight: bold; background-color: #fef2f2;';
        }

        const notesHtml = book.notes ? `<div style="font-size: 11px; color: #475569; font-weight: normal; margin-top: 4px; direction: rtl;"><strong>הערה:</strong> ${book.notes}</div>` : '';

        // Add "נדרש לכולם" header row above the English dictionary book in printable output
        if (book.id === 'english_dict') {
          tableBodyHtml += `
            <tr style="background-color: #eff6ff; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <td colspan="2" style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; direction: rtl; font-size: 13px; font-weight: bold; color: #1e40af; font-family: 'Assistant', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-image: linear-gradient(to right, #eff6ff, #dbeafe);">
                נדרש לכולם
              </td>
            </tr>
          `;
        }

        tableBodyHtml += `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; direction: rtl; font-family: 'Assistant', sans-serif; font-size: 13px;">
              <div style="font-weight: bold; color: #0f172a;">${book.title}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">מחבר / הוצאה: ${book.author || '-'}</div>
              ${notesHtml}
            </td>
            <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; font-family: 'Assistant', sans-serif; font-size: 12px; ${typeStyle}">${bType}</td>
          </tr>
        `;
      });
    });

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>${headerTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&display=swap');
          * { font-family: 'Assistant', sans-serif !important; box-sizing: border-box; }
          body { font-family: 'Assistant', sans-serif; direction: rtl; text-align: right; padding: 40px; margin: 0; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1d4ed8; color: white; padding: 14px; font-weight: bold; border: 1px solid #cbd5e1; text-align: center; font-family: 'Assistant', sans-serif; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { border: 1px solid #cbd5e1; padding: 12px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="background-color: #2563eb; color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; text-align: right; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; font-family: 'Assistant', sans-serif; letter-spacing: -0.5px;">${headerTitle}</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; font-family: 'Assistant', sans-serif; font-weight: 500;">ישיבת בני עקיבא לפיד מודיעין - שנת הלימודים תשפ"ז (2026-2027)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 75%; text-align: right; padding-right: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">ספר הלימוד ופרטים</th>
              <th style="width: 25%; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">סוג הספר</th>
            </tr>
          </thead>
          <tbody>
            ${tableBodyHtml}
          </tbody>
        </table>
        <p style="margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 20px; font-family: 'Assistant', sans-serif; font-weight: 600;">
          הופק אוטומטית עבור ישיבת בני עקיבא לפיד מודיעין. המשך קיץ נעים ושנת לימודים מוצלחת!
        </p>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;
  };

  // Print list
  const handlePrintList = () => {
    try {
      const htmlContent = generateDocumentHtml();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        // Fallback using hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 2000);
          }, 500);
        } else {
          window.print();
        }
      }
    } catch (e) {
      console.error('Print failed', e);
      setPrintError(true);
      setTimeout(() => setPrintError(false), 8000);
    }
  };

  // Group current displayed items by subject for render on screen
  const displayedBySubject: Record<string, { section: string; items: DisplayItem[] }> = {};
  displayedItems.forEach(item => {
    if (!displayedBySubject[item.displaySubject]) {
      displayedBySubject[item.displaySubject] = { section: item.section, items: [] };
    }
    displayedBySubject[item.displaySubject].items.push(item);
  });

  const sortedSubjectsKeys = Object.keys(displayedBySubject).sort((a, b) => getSubjectSortIndex(a) - getSubjectSortIndex(b));

  return (
    <div className="space-y-6 print:p-0" dir="rtl">
      {/* Notice bar at the top */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 text-xs sm:text-sm text-blue-900 dark:text-blue-300 leading-relaxed text-right flex items-center gap-2.5 print:hidden shadow-sm">
        <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
        <p className="font-medium">
          {selectedGrade ? (
            <span>
              <strong className="font-extrabold text-blue-900 dark:text-blue-200">שימו לב לסוגי הכיתות: </strong>
              {GRADE_CLASS_NOTICES[selectedGrade]}
            </span>
          ) : (
            <span>
              <strong className="font-extrabold text-blue-900 dark:text-blue-200">שימו לב: </strong>
              בחרו שכבת לימוד למטה כדי לראות את סוגי הכיתות, ההקבצות וספרי הלימוד המותאמים עבורכם.
            </span>
          )}
        </p>
      </div>

      {/* Selector Dashboard Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-blue-600"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              מחולל רשימות ספרי לימוד מלאות לשנת תשפ"ז
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
              בחרו שכבה וסוג כיתה כדי לקבל מיד רשימה מלאה להדפסה, מותאמת אישית עם כל ההבדלים, ההקבצות והמגמות. ניתן למחוק ספרים ספציפיים מהרשימה לפני ההדפסה.
            </p>
          </div>
          <button
            onClick={handleResetSelections}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 self-end md:self-auto cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>איפוס בחירות</span>
          </button>
        </div>

        {/* Selection Fields */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          
          {/* Grade selection buttons */}
          <div className="space-y-3">
            <label className="text-xs font-bold tracking-wider text-slate-450 dark:text-slate-400 block">
              שכבת לימוד:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['ז', 'ח', 'ט', 'י', 'י"א', 'י"ב'] as GradeLevel[]).map(gradeLevel => {
                const isSelected = selectedGrade === gradeLevel;
                return (
                  <button
                    key={gradeLevel}
                    onClick={() => {
                      setSelectedGrade(gradeLevel);
                      // Reset class mode if switching grades so they choose fresh
                      setClassMode('');
                    }}
                    className={`py-3 px-2 text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    שכבה {gradeLevel === 'י"א' || gradeLevel === 'י"ב' ? gradeLevel : `${gradeLevel}'`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Mode Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold tracking-wider text-slate-450 dark:text-slate-400 block">
              סוג כיתה בשכבה:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={!selectedGrade}
                onClick={() => setClassMode('other')}
                className={`p-3.5 text-right rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                  !selectedGrade 
                    ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800' 
                    : classMode === 'other'
                      ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-slate-350 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-xs sm:text-sm">כל כיתות השכבה (ללא כיתה 6)</span>
                <span className="text-[10px] opacity-80 leading-tight">יוצר רשימה מפורטת עבור כלל הכיתות, עם פיצול מקצועות אוטומטי במקרה של הבדלים</span>
              </button>

              <button
                disabled={!selectedGrade}
                onClick={() => setClassMode('6')}
                className={`p-3.5 text-right rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                  !selectedGrade 
                    ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800' 
                    : classMode === '6'
                      ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-slate-350 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-xs sm:text-sm">כיתה 6 בלבד (חינוך מיוחד / תקשורת)</span>
                <span className="text-[10px] opacity-80 leading-tight">יוצר רשימה מיוחדת לכיתה 6 הכוללת שילובים מותאמים, הקבצות וספרי מגמות</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Output list section */}
      <AnimatePresence mode="wait">
        {!selectedGrade || !classMode ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm"
          >
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/30">
              <BookOpen size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">רשימת הספרים ממתינה לבחירתכם</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                בחרו שכבה למעלה (למשל שכבה ז' או שכבה י') ולאחר מכן בחרו את סוג הכיתה כדי להפיק מיד את הרשימה המלאה.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="has-list-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Header Title Board Card */}
            <div className="bg-blue-600 text-white rounded-2xl shadow-md p-6 sm:p-8 text-right flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 opacity-60"></div>
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display leading-snug">
                  {generatedTitle}
                </h1>
                <p className="text-xs sm:text-sm text-blue-100 font-semibold opacity-90">
                  ישיבת בני עקיבא לפיד מודיעין - שנת הלימודים תשפ"ז (2026-2027)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end print:hidden shrink-0 z-10">
                {hasDeletions && (
                  <button
                    onClick={handleRestoreOriginal}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700/80 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-500/30"
                  >
                    <RotateCcw size={14} />
                    <span>שחזור רשימה מקורית</span>
                  </button>
                )}

                <button
                  onClick={handlePrintList}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-50 text-blue-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Printer size={15} />
                  <span>הדפסה / שמירה כ-PDF</span>
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {printError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-3 text-sm">
                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                <p>הדפסת הקובץ נחסמה על ידי הדפדפן. אנא אפשר חלונות קופצים או לחץ שוב להפעלה.</p>
              </div>
            )}

            {/* Info bar about manual deletion */}
            <div className="bg-amber-500/5 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed text-right flex items-center gap-3 print:hidden">
              <span className="size-2 bg-amber-500 rounded-full animate-ping shrink-0"></span>
              <p>
                <strong>טיפ להדפסה:</strong> באפשרותכם למחוק ספרים לא רצויים מהרשימה המוצגת על ידי לחיצה על כפתור המחיקה <Trash2 size={11} className="inline mx-0.5" /> האדום שליד כל ספר. המחיקה תשפיע רק על ההדפסה הנוכחית ולא תשמור שינויים קבועים בקובץ.
              </p>
            </div>

            {/* Main textbooks display list container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">פירוט ספרי הלימוד שהותאמו</h3>
                <span className="text-[11px] text-slate-500 font-sans font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  נמצאו {displayedItems.length} ספרים
                </span>
              </div>

              {displayedItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                        <th className="px-6 py-3 w-[70%] text-right pr-6">שם ספר הלימוד</th>
                        <th className="px-4 py-3 w-[20%] text-center">סוג הספר</th>
                        <th className="px-6 py-3 w-[10%] text-center print:hidden">פעולה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {(() => {
                        let currentSection: 'regular' | 'math_english' | 'majors' | null = null;

                        return sortedSubjectsKeys.map(subjectHeader => {
                          const { section, items } = displayedBySubject[subjectHeader];
                          const rows: React.ReactNode[] = [];

                          // If we cross into Math/English or Majors, render a section header block
                          if (section === 'math_english' && currentSection !== 'math_english') {
                            currentSection = 'math_english';
                            rows.push(
                              <tr key="sec-math_english-header" className="bg-blue-600/10 dark:bg-blue-900/30 border-y border-blue-200 dark:border-blue-900/60">
                                <td colSpan={3} className="px-6 py-4 text-right text-sm sm:text-base font-extrabold text-blue-900 dark:text-blue-300">
                                  מתמטיקה ואנגלית (כלל ההקבצות בסדר יורד)
                                </td>
                              </tr>
                            );
                          } else if (section === 'majors' && currentSection !== 'majors') {
                            currentSection = 'majors';
                            rows.push(
                              <tr key="sec-majors-header" className="bg-indigo-600/10 dark:bg-indigo-900/30 border-y border-indigo-200 dark:border-indigo-900/60">
                                <td colSpan={3} className="px-6 py-4 text-right text-sm sm:text-base font-extrabold text-indigo-900 dark:text-indigo-300">
                                  מגמות לימוד
                                </td>
                              </tr>
                            );
                          }

                          // Push the subject header row
                          rows.push(
                            <tr key={`subj-${subjectHeader}`} className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-750">
                              <td colSpan={3} className="px-6 py-3 text-right text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-400 bg-blue-500/[0.03]">
                                {subjectHeader}
                              </td>
                            </tr>
                          );

                          // Push books rows
                          items.forEach(item => {
                            const book = item.book;
                            const bType = book.bookType || 'ספר לימוד / קריאה';
                            
                            // Add "נדרש לכולם" header row above the English dictionary book
                            if (book.id === 'english_dict') {
                              rows.push(
                                <tr key="subj-english-required-header" className="bg-blue-500/10 dark:bg-blue-950/20 border-y border-blue-250 dark:border-blue-900/40">
                                  <td colSpan={3} className="px-6 py-2.5 text-right text-xs sm:text-sm font-black text-blue-800 dark:text-blue-300">
                                    נדרש לכולם
                                  </td>
                                </tr>
                              );
                            }

                            let bTypeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent';
                            if (bType === 'חוברת עבודה') {
                              bTypeStyle = 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
                            } else if (bType === 'לא בהשאלת הספרים') {
                              bTypeStyle = 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30';
                            }

                            rows.push(
                              <tr
                                key={item.uniqueId}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors group"
                              >
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-tight">
                                    {book.title}
                                  </div>
                                  <div className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                    <span>מחבר / הוצאה: <strong>{book.author || '-'}</strong></span>
                                    {book.price && <span>מחיר משוער: <strong>₪{book.price}</strong></span>}
                                  </div>
                                  {book.notes && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-850 inline-block font-sans">
                                      <strong>הערה:</strong> {book.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${bTypeStyle}`}>
                                    {bType}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center print:hidden">
                                  <button
                                    onClick={() => handleDeleteItem(item.uniqueId)}
                                    title="הסר מהרשימה הנוכחית"
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });

                          return rows;
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-24 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-850 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen size={28} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-slate-800 dark:text-slate-200 font-bold font-display">רשימת הספרים ריקה</h4>
                    <p className="text-slate-450 text-xs max-w-sm mx-auto leading-relaxed">
                      ייתכן שהסרתם את כל הספרים מהרשימה הזו. באפשרותכם ללחוץ על "שחזור רשימה מקורית" כדי להתחיל מחדש.
                    </p>
                  </div>
                  {hasDeletions && (
                    <button
                      onClick={handleRestoreOriginal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      שחזור רשימה מקורית
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Helpful Notice at Bottom */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5 flex items-start gap-4 print:hidden text-right">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-350 font-bold">הודעת הנהלת הישיבה:</p>
                <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                  רשימת הספרים יכולה להתעדכן במידת הצורך במהלך הקיץ. אנא עקבו תמיד אחר ההודעות העדכניות בקבוצות הווטסאפ של השכבות.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
