#!/usr/bin/env python
"""Import the fourteen supplied YAEL booklets, without supplying answer keys.

Requires Poppler's pdftotext and PyMuPDF. Run from the repository root.
Poppler's layout mode sorts by physical position (the PDF content-stream order
puts some questions out of sequence) and reconstructs logical Hebrew bidi runs.
Never reverse an entire Hebrew string: that reverses numbers and niqqud too.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts/yael-arabic-prep/lib"
BIDI = re.compile("[\u200e\u200f\u202a-\u202e\u2066-\u2069]")
QUESTION = re.compile(r"(?<!\d)(\d{1,2})\.\s*$")
# Poppler uses nested direction runs for parentheses and their numbers. Removing
# the run delimiters can leave either "()1", "( )1", or "(1)".
LABEL = re.compile(r"\(\s*\)\s*(\d{1,2})|\(\s*(\d{1,2})\s*\)")
HEBREW = re.compile("[\u05d0-\u05ea]")


def clean(text: str, pointed_words=()) -> str:
    # Poppler emits an LRE around each visual left-to-right run embedded in
    # Hebrew. Invert the sequence of directional tokens, NOT the digits/Latin
    # letters inside each token. For example ".2014" becomes "2014.", "?8"
    # becomes "8?", and an option run "90% )1" becomes "1) 90%".
    def logical_run(match):
        tokens = re.findall(r"\d+(?:[.,]\d+)*(?:%)?|[A-Za-z]+|_+|[^\dA-Za-z_]", match.group(1))
        return " " + "".join(reversed(tokens)).strip() + " "

    text = re.sub("\u202a([^\u202c]*)\u202c", logical_run, text)
    text = BIDI.sub("", text).replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    # These spaces come from separate positioned glyphs, not source word gaps.
    text = re.sub(r"([\u0591-\u05c7]) +(?=[\u0591-\u05c7])", r"\1", text)
    text = re.sub(r"([\u0591-\u05c7]) +(?=[\u05d0-\u05ea])", r"\1", text)
    text = re.sub(r"(^|\s)([\u0591-\u05c7]+)([\u05d0-\u05ea])", r"\1\3\2", text)
    # Word boundaries from PyMuPDF supplement Poppler's layout reconstruction:
    # zero-width vowel glyphs sometimes cause Poppler to split a single word.
    # Only replace a pointed candidate with the same source consonants; never
    # supply spelling or vowels from a dictionary.
    for pattern, source_word in pointed_words:
        text = pattern.sub(
            lambda m: source_word if re.search("[\u0591-\u05c7]", m.group()) else m.group(),
            text,
        )
    text = re.sub(r" +([.,:;!?])", r"\1", text)
    text = re.sub(r"([.,:;!?])(?=[\u05d0-\u05ea])", r"\1 ", text)
    text = re.sub(r"([\u05d0-\u05ea]) +-(?=\S)", r"\1-", text)
    return text


def label_number(match: re.Match) -> int:
    return int(match.group(1) or match.group(2))


def irrelevant(line: str) -> bool:
    return (
        not HEBREW.search(line)
        or line == "דף ריק"
        or "המשיכו לעמוד הבא" in line
        or "אל תהפכו את הדף" in line
        or line.startswith("בפרק זה ")
    )


def extract(path: Path) -> dict:
    filename = path.name
    match = re.search(r"(?:B|exam_)(\d{2})", filename)
    assert match, filename
    exam_number = int(match.group(1))
    exam_id = f"b{exam_number:02}"
    result = {
        "id": exam_id,
        "title": f"B-{exam_number:02}",
        "sourceFilename": filename,
        "sections": [],
        "essayPrompt": "",
    }
    # Explicitly retain PDF line boundaries and hyphens.
    text = subprocess.check_output(
        ["pdftotext", "-layout", "-remove-hyphens", "none", str(path), "-"],
    ).decode("utf-8")
    pages = text.split("\f")
    if not pages[-1].strip():
        pages.pop()
    document = pymupdf.open(path)
    assert len(pages) == len(document), filename
    section = None
    current = None
    current_part = None
    passage_lines = None
    passage = None
    essay_lines = None
    passage_count = 0
    question_type = None

    def finish_question():
        nonlocal current, current_part
        if current is not None:
            current["prompt"] = "\n".join(current["prompt"]).strip()
            current["options"] = [
                "\n".join(option).strip() for option in current["options"]
            ]
            assert current["prompt"], (filename, current["id"], "empty prompt")
            assert len(current["options"]) == 4, (filename, current)
            assert all(current["options"]), (filename, current["id"], "empty option")
            assert len(set(current["options"])) == 4, (filename, current["id"], "duplicate options")
            section.append(current)
        current = None
        current_part = None

    for page_number, page in enumerate(pages, 1):
        pointed_words = []
        for word_info in document[page_number - 1].get_text("words"):
            word = word_info[4].strip('.,:;!?"״׳()')
            if not re.fullmatch("[\u0591-\u05c7\u05d0-\u05ea]+", word):
                continue
            if not re.search("[\u0591-\u05c7]", word):
                continue
            base = re.sub("[\u0591-\u05c7]", "", word)
            if len(base) < 2:
                continue
            word = re.sub(r"^([\u0591-\u05c7]+)([\u05d0-\u05ea])", r"\2\1", word)
            pattern = re.compile(
                "(?<![\u0591-\u05c7\u05d0-\u05ea])"
                + "[\u0591-\u05c7\\s]*".join(map(re.escape, base))
                + "[\u0591-\u05c7]*(?![\u0591-\u05c7\u05d0-\u05ea])"
            )
            pointed_words.append((pattern, word))
        for original_line in page.splitlines():
            line = clean(original_line, pointed_words)
            if not line:
                # Paragraph breaks in passages remain meaningful; do not insert
                # additional line breaks inside wrapped questions or options.
                if passage_lines and passage_lines[-1] != "":
                    passage_lines.append("")
                continue
            if irrelevant(line):
                continue
            section_match = re.search(r"(?:^|\s)פרק\s+([1-4])$|^([1-4])\s+פרק$", line)
            if section_match:
                finish_question()
                number = int(section_match.group(1) or section_match.group(2))
                if number <= 3:
                    assert number == len(result["sections"]) + 1, (filename, line)
                    section = []
                    result["sections"].append(section)
                    passage = None
                continue
            if line in ("השלמת משפטים", "ניסוח מחדש", "הבנת הנקרא"):
                finish_question()
                question_type = {
                    "השלמת משפטים": "completion",
                    "ניסוח מחדש": "restatement",
                    "הבנת הנקרא": "reading",
                }[line]
                continue
            if re.fullmatch(r"קטע\s+[IVX]+|[IVX]+\s+קטע", line):
                finish_question()
                passage_lines = []
                passage_count += 1
                continue
            if line == "השאלות":
                assert passage_lines, (filename, page_number, "empty passage")
                passage = "\n".join(passage_lines).strip()
                passage_lines = None
                continue
            if passage_lines is not None:
                # Put the printed margin label consistently at the start of its
                # own physical line, preserving only labels actually printed.
                labels = list(LABEL.finditer(line))
                assert len(labels) <= 1, (filename, page_number, line)
                if labels:
                    label = labels[0]
                    number = label_number(label)
                    line = f"({number}) " + clean(line[:label.start()] + line[label.end():])
                passage_lines.append(line)
                continue
            if line == "נושא החיבור:":
                finish_question()
                essay_lines = []
                continue
            if essay_lines is not None:
                essay_lines.append(line)
                continue
            question_match = QUESTION.search(line)
            if question_match:
                finish_question()
                number = int(question_match.group(1))
                assert section is not None
                # The rendered source actually prints "15" twice on B-15 p21.
                # Use its sequential position (14) for app navigation/IDs only;
                # neither the question wording nor choices are corrected.
                if exam_number == 15 and len(result["sections"]) == 3 and page_number == 21 and len(section) == 13:
                    assert number == 15
                    number = 14
                assert number == len(section) + 1, (filename, page_number, number, len(section))
                assert question_type, (filename, page_number, number)
                current = {
                    "id": f"{exam_id}-s{len(result['sections'])}-q{number:02}",
                    "number": number,
                    "type": question_type,
                    "prompt": [clean(line[:question_match.start()])],
                    "options": [],
                    "sourcePage": page_number,
                    "answer": None,
                }
                if question_type == "reading":
                    assert passage, (filename, page_number, number)
                    current["passage"] = passage
                current_part = current["prompt"]
                continue
            if current is not None:
                labels = list(LABEL.finditer(line))
                # Only the next expected option marker starts an option. All
                # continuation lines remain with their own preceding option.
                expected = len(current["options"]) + 1
                option_label = next((m for m in labels if label_number(m) == expected), None)
                if option_label:
                    option = clean(line[:option_label.start()] + line[option_label.end():])
                    current_part = [option]
                    current["options"].append(current_part)
                else:
                    current_part.append(line)
    finish_question()
    assert essay_lines, (filename, "missing essay")
    result["essayPrompt"] = "\n".join(essay_lines)
    # Poppler cannot untangle this Hebrew/Latin/parenthesis run. This is a
    # transcription of the rendered boxed prompt on B-14 page 25, not a rewrite.
    if exam_number == 14:
        result["essayPrompt"] = (
            "האם אתם מעדיפים לדבר בטלפון או להתכתב בהודעות (למשל\n"
            "בוואטסאפ או בהודעות SMS)? הסבירו."
        )
    assert len(result["sections"]) == 3, filename
    assert all(len(s) == 22 for s in result["sections"]), (filename, [len(s) for s in result["sections"]])
    assert passage_count == 6, (filename, passage_count)
    return result


TS = '''// Generated from the supplied PDF booklets by scripts/import-yael-pdfs.py.
// These sources do not contain answer keys. A null answer must not be graded.
import importedExams from "./imported-exams.json";

export type ImportedQuestion = {
  id: string;
  number: number;
  type: "completion" | "restatement" | "reading";
  prompt: string;
  options: string[];
  passage?: string;
  /** One-based physical PDF page, including blank pages. */
  sourcePage: number;
  /** Zero-based option index when supplied by a source key; otherwise null. */
  answer: number | null;
};

export type ImportedExam = {
  id: string;
  title: string;
  sourceFilename: string;
  sections: ImportedQuestion[][];
  essayPrompt: string;
};

export const IMPORTED_EXAMS: ImportedExam[] = importedExams as ImportedExam[];
'''


def main():
    paths = list((ROOT / "attached_assets").glob("*1792232907717.pdf"))
    assert len(paths) == 14, f"Expected 14 supplied PDFs, got {len(paths)}"
    exams = sorted((extract(path) for path in paths), key=lambda exam: exam["id"])
    questions = [q for e in exams for section in e["sections"] for q in section]
    assert len(questions) == len({q["id"] for q in questions}) == 924
    assert all(q["answer"] is None for q in questions)
    assert all(q.get("passage") for q in questions if q["type"] == "reading")
    assert all([q["number"] for q in section] == list(range(1, 23))
               for exam in exams for section in exam["sections"])
    assert all(not any(phrase in part for phrase in (
        "בפרק זה", "הזמן המוקצב", "המשיכו לעמוד הבא", "התשובה שתשלים",
    )) for q in questions for part in [q["prompt"], *q["options"]])
    # All extraction and validation finishes before either live-imported file is
    # replaced, so Metro never sees a partially generated JSON document.
    for name, content in (
        ("imported-exams.json", json.dumps(exams, ensure_ascii=False, indent=2) + "\n"),
        ("imported-exams.ts", TS),
    ):
        temporary = OUTPUT / (name + ".tmp")
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(OUTPUT / name)
    print(f"Validated {len(exams)} exams, 42 sections, {len(questions)} unique questions,")
    reading_count = sum(q["type"] == "reading" for q in questions)
    print(f"3696 distinct-within-question options, {reading_count} reading questions / 84 passages,")
    print("14 essay prompts; 924 null answers (no source answer keys).")
    print("Source quirks retained: irregular passage margin labels on B-11 p20")
    print("and B-12 p6. B-15 p21 first printed '15' uses sequential number 14.")
    print("B-17 has 24 physical pages; its essay is printed p25 / physical p24.")
    for exam in exams:
        print(exam["title"], exam["sourceFilename"], [len(s) for s in exam["sections"]])


if __name__ == "__main__":
    main()
