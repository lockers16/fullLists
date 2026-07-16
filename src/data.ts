/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Book, GradeLevel, SelectionState } from './types';
import booksData from './books.json';

const rawBooks: Book[] = booksData as Book[];

export const DEFAULT_BOOKS: Book[] = rawBooks.map(book => {
  const bType = book.bookType;
  const validTypes = ['ספר לימוד / קריאה', 'חוברת עבודה', 'לא בהשאלת הספרים'];
  
  if (bType && validTypes.includes(bType)) {
    return book;
  }
  
  // Fallback if not explicitly set or not valid
  const titleLower = (book.title || '').toLowerCase();
  const hasWord = titleLower.includes('חוברת') || titleLower.includes('workbook');
  
  return {
    ...book,
    bookType: hasWord ? 'חוברת עבודה' : 'ספר לימוד / קריאה'
  };
});

// Options logic depending on status
export function getEnglishOptions(grade: GradeLevel | ''): string[] {
  if (!grade) return [];
  if (['ז', 'ח', 'ט'].includes(grade)) {
    return ['דוברי אנגלית', 'א', 'ב', "ג' - יעל", "ג' - מימי"];
  } else if (grade === 'י') {
    return ['דוברי אנגלית', '5 יח"ל - מואץ', '5 יח"ל', '4 יח"ל', '3-4 יח"ל'];
  } else if (grade === 'י"א') {
    return ['דוברי אנגלית', '5 יח"ל - מואץ', '5 יח"ל', '4 יח"ל', '3 יח"ל'];
  } else {
    // י"ב
    return ['5 יח"ל', '4 יח"ל', 'סיים'];
  }
}

export function getMathOptions(grade: GradeLevel | ''): string[] {
  if (!grade) return [];
  if (grade === 'ז') {
    return ['האצה', 'לא בהאצה', 'כיתת חינוך מיוחד / תקשורת'];
  } else if (grade === 'ח') {
    return ['האצה', 'א', "א'1", "א'2", 'ב', 'כיתת חינוך מיוחד / תקשורת'];
  } else if (grade === 'ט') {
    return ['האצה', 'א', "א'1", "א'2", 'ב', 'כיתת חינוך מיוחד / תקשורת'];
  } else if (grade === 'י') {
    return ['האצה', '5 יח"ל', '4 יח"ל', '3 יח"ל'];
  } else {
    // י"א, י"ב
    return ['סיים', '5 יח"ל', '4 יח"ל', '3 יח"ל'];
  }
}

export function isMajorRequired(grade: GradeLevel | ''): boolean {
  if (!grade) return false;
  return ['י', 'י"א', 'י"ב'].includes(grade);
}

export const MAJOR_OPTIONS = [
  'מדעי המחשב',
  'פיזיקה',
  'ביולוגיה',
  'ניהול עסקי',
  'משפטים',
  'מוזיקה',
  'תקשורת',
  'ערבית',
  'אלקטרוניקה',
  'כימיה',
  'אין'
];

/**
 * Filter the total books list based on current selection criteria
 */
export function filterBooks(books: Book[], selection: SelectionState): Book[] {
  if (!selection.grade) return [];

  return books.filter(book => {
    // If student has finished (סיים) Math, do not show any Math books
    const isMathBook = book.subject === 'מתמטיקה' || (book.associations && book.associations.some(assoc => assoc.subjectType === 'מתמטיקה'));
    if (isMathBook && selection.mathGroup === 'סיים') {
      return false;
    }

    // If student has finished (סיים) English, do not show any English books
    const isEnglishBook = book.subject === 'אנגלית' || (book.associations && book.associations.some(assoc => assoc.subjectType === 'אנגלית'));
    if (isEnglishBook && selection.englishGroup === 'סיים') {
      return false;
    }

    // Guard for "עתודה" subject books to only show if student is in grade ז, ח, ט and replied Yes (כן)
    const isAtudaBook = book.subject === 'עתודה' || (book.associations && book.associations.some(assoc => assoc.subjectType === 'עתודה'));
    if (isAtudaBook) {
      const isEligibleGrade = ['ז', 'ח', 'ט'].includes(selection.grade);
      const isYes = selection.atudaProgram === 'כן';
      if (!isEligibleGrade || !isYes) return false;
    }

    // If the book has explicit, multiple associations, match them directly!
    // This allows a single book to be assigned to independent combinations of grade, class, and stream/group.
    if (book.associations && book.associations.length > 0) {
      return book.associations.some(assoc => {
        // 1. Grade check
        if (assoc.grade !== selection.grade) return false;

        // 2. Class check (if association specifies specific class numbers)
        if (assoc.classNumbers && assoc.classNumbers.length > 0) {
          if (selection.classNumber !== '' && !assoc.classNumbers.includes(selection.classNumber as number)) {
            return false;
          }
        } else if (assoc.classNumber !== undefined && assoc.classNumber !== 0) {
          if (selection.classNumber !== '' && assoc.classNumber !== selection.classNumber) {
            return false;
          }
        }

        // 3. Mandatory book is automatically included for any student matching core grade/class ONLY for general, non-streamed/non-major subjects
        const isMathOrEnglishOrMajor = assoc.subjectType === 'מתמטיקה' || 
                                       assoc.subjectType === 'אנגלית' || 
                                       (MAJOR_OPTIONS.includes(assoc.subjectType) && assoc.subjectType !== 'אין');
        if (book.isMandatory && !isMathOrEnglishOrMajor) return true;

        // 4. Stream and Group checks
        if (assoc.subjectType === 'מתמטיקה') {
          if (!assoc.stream) return true;
          if (selection.mathGroup === assoc.stream) return true;
          if (selection.grade === 'ז') {
            if (selection.mathGroup === 'כיתת חינוך מיוחד / תקשורת') {
              return assoc.stream === 'כיתת חינוך מיוחד / תקשורת';
            }
            if (selection.mathGroup === 'לא בהאצה') {
              return assoc.stream !== 'האצה' && assoc.stream !== 'כיתת חינוך מיוחד / תקשורת';
            }
            if (selection.mathGroup === 'האצה') {
              return assoc.stream === 'האצה';
            }
          }
          return false;
        }

        if (assoc.subjectType === 'אנגלית') {
          if (!assoc.stream) return true;
          if (selection.englishGroup === assoc.stream) return true;
          if (['ז', 'ח', 'ט'].includes(selection.grade)) {
            if ((selection.englishGroup === "ג' - יעל" || selection.englishGroup === "ג' - מימי") && assoc.stream === "ג'") {
              return true;
            }
          }
          return false;
        }

        const isMajor = MAJOR_OPTIONS.includes(assoc.subjectType) && assoc.subjectType !== 'אין';
        if (isMajor) {
          return selection.majors && selection.majors.includes(assoc.subjectType);
        }

        // Any general subject like תנ"ך, ספרות, לשון, גמרא etc. is automatically matched once grade and class match
        return true;
      });
    }

    // --- Legacy / Default Books Fallback Matching Logic ---
    // 1. Must be targeted at this grade level
    if (book.grades.length > 0 && !book.grades.includes(selection.grade as string)) {
      return false;
    }

    // 2. Class check (if there are explicit classes, and user has selection)
    if (book.classes.length > 0 && selection.classNumber !== '') {
      if (!book.classes.includes(selection.classNumber as number)) {
        return false;
      }
    }

    // If it's mandatory, and user meets basic criteria (matching grade/class), include it ONLY if there are no stream/major rules
    const isStreamed = (book.english && book.english.length > 0) || 
                       (book.math && book.math.length > 0) || 
                       (book.majors && book.majors.length > 0);
    if (book.isMandatory && !isStreamed) {
      return true;
    }

    // 3. English stream check
    const hasEnglishRule = book.english.length > 0;
    if (hasEnglishRule) {
      let isMatch = false;
      if (selection.englishGroup) {
        if (book.english.includes(selection.englishGroup)) {
          isMatch = true;
        } else if (['ז', 'ח', 'ט'].includes(selection.grade) && (selection.englishGroup === "ג' - יעל" || selection.englishGroup === "ג' - מימי") && book.english.includes("ג'")) {
          isMatch = true;
        }
      }
      if (!isMatch) {
        return false;
      }
    }

    // 4. Mathematics stream check
    const hasMathRule = book.math.length > 0;
    if (hasMathRule) {
      if (!selection.mathGroup) return false;
      if (selection.grade === 'ז') {
        if (selection.mathGroup === 'כיתת חינוך מיוחד / תקשורת') {
          if (book.math.includes('כיתת חינוך מיוחד / תקשורת')) return true;
        } else if (selection.mathGroup === 'לא בהאצה') {
          if (!book.math.includes('האצה') && !book.math.includes('כיתת חינוך מיוחד / תקשורת')) return true;
        } else {
          if (book.math.includes('האצה')) return true;
        }
        return false;
      }
      if (!book.math.includes(selection.mathGroup)) {
        return false;
      }
    }

    // 5. Major check
    const hasMajorRule = book.majors.length > 0;
    if (hasMajorRule) {
      if (!selection.majors || selection.majors.length === 0) {
        return false;
      }
      const hasMatchingMajor = book.majors.some(m => selection.majors.includes(m));
      if (!hasMatchingMajor) {
        return false;
      }
    }

    return true;
  });
}
