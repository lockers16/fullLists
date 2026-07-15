/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BookAssociation {
  grade: string;
  classNumbers?: number[]; // List of class numbers (empty/undefined/all selected means all classes in the grade)
  classNumber?: number;    // Single class number for fine-grained assignments
  subjectType: string;  // Subject type e.g. 'מתמטיקה', 'אנגלית', 'פיזיקה'
  stream?: string;      // Stream name e.g. '5 יח"ל', 'האצה'
}

export interface Book {
  id: string;
  title: string;          // שם הספר
  subject: string;        // מקצוע לימוד (למשל: מתמטיקה, אנגלית, ספרות)
  author: string;         // מחבר/ים או הוצאה לאור
  price?: number;         // מחיר משוער
  isMandatory: boolean;   // האם חובה לכולם בשכבה זו?
  grades: string[];       // שכבות מתאימות (למשל: ['ז', 'ח'])
  classes: number[];      // מספרי כיתות ספציפיים (אם ריק - מתאים לכל הכיתות 1-7)
  english: string[];      // הקבצות אנגלית מתאימות (אם ריק - מתאים לכל ההקבצות)
  math: string[];         // הקבצות מתמטיקה מתאימות (אם ריק - מתאים לכל ההקבצות)
  majors: string[];       // מגמות מתאימות (אם ריק - מתאים לכל ההקבצות/ללא מגמה)
  notes?: string;         // הערות מיוחדות (למשל: "יש לרכוש מהדורה חדשה מעודכנת בלבד")
  bookType?: 'ספר לימוד / קריאה' | 'חוברת עבודה' | 'לא בהשאלת הספרים'; // סוג הספר
  associations?: BookAssociation[]; // רשימת שיוכים מרובים של הספר לקבוצות לימוד
  order?: number;         // מיקום סדר פנימי
}

export type GradeLevel = 'ז' | 'ח' | 'ט' | 'י' | 'י"א' | 'י"ב';

export interface SelectionState {
  grade: GradeLevel | '';
  classNumber: number | '';
  englishGroup: string;
  mathGroup: string;
  majors: string[]; // עד שתי מגמות
  atudaProgram?: 'כן' | 'לא' | '';
}
