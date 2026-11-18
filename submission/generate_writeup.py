#!/usr/bin/env python3
"""Generate the editable Markdown draft as a branded PDF. Requires reportlab."""
from pathlib import Path
import html
import re
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parent
FINAL = "--final" in sys.argv
source = (ROOT / ("SUBMISSION_FINAL.md" if FINAL else "SUBMISSION_DRAFT.md")).read_text()
out = ROOT / ("Puppet_House_Writeup.pdf" if FINAL else "Puppet_House_Writeup_DRAFT.pdf")
def metadata(label):
    match = re.search(r"\*\*" + re.escape(label) + r":\*\* (.+)", source)
    return html.escape(match.group(1).strip()) if match else "PENDING"
W, H = A4
INK = colors.HexColor("#111014")
PAPER = colors.HexColor("#F7F4F0")
CORAL = colors.HexColor("#FF6B57")
ACID = colors.HexColor("#D7F477")
MUTED = colors.HexColor("#716A73")
LINE = colors.HexColor("#DDD5D8")

styles = getSampleStyleSheet()
body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.4, leading=14, textColor=INK, spaceAfter=7)
h1 = ParagraphStyle("H1", parent=body, fontName="Helvetica-Bold", fontSize=22, leading=25, spaceBefore=15, spaceAfter=9, textColor=INK)
h2 = ParagraphStyle("H2", parent=body, fontName="Helvetica-Bold", fontSize=14, leading=17, spaceBefore=13, spaceAfter=6, textColor=INK)
bullet = ParagraphStyle("Bullet", parent=body, leftIndent=14, firstLineIndent=-8, bulletIndent=3, spaceAfter=4)
small = ParagraphStyle("Small", parent=body, fontSize=7.8, leading=10, textColor=MUTED)
callout = ParagraphStyle("Callout", parent=body, backColor=colors.HexColor("#FFF0E9"), borderColor=CORAL, borderWidth=.7, borderPadding=10, leading=14, spaceBefore=8, spaceAfter=12)


def inline(text):
    value = html.escape(text.strip())
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", value)
    return value


def decorate(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(INK)
        canvas.rect(0, 0, W, H, stroke=0, fill=1)
        canvas.setStrokeColor(colors.HexColor("#3B323C"))
        canvas.setLineWidth(.5)
        canvas.line(22 * mm, 21 * mm, W - 22 * mm, 21 * mm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#A99DAC"))
        canvas.drawString(22 * mm, 15 * mm, "NEXCONN BUILD CHALLENGE 2026  /  GAMING & LIVE STREAMS")
        canvas.drawRightString(W - 22 * mm, 15 * mm, "SUBMISSION WRITE-UP" if FINAL else "DRAFT — NOT FOR SUBMISSION")
    else:
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, W, H, stroke=0, fill=1)
        canvas.setStrokeColor(LINE)
        canvas.line(20 * mm, H - 15 * mm, W - 20 * mm, H - 15 * mm)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(CORAL)
        canvas.drawString(20 * mm, H - 12 * mm, "PUPPET HOUSE")
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(W - 20 * mm, H - 12 * mm, "SUBMISSION WRITE-UP" if FINAL else "SUBMISSION WRITE-UP  /  DRAFT")
        canvas.line(20 * mm, 14 * mm, W - 20 * mm, 14 * mm)
        canvas.drawString(20 * mm, 10 * mm, "AI contestants. Human puppeteers. Hidden agendas.")
        canvas.drawRightString(W - 20 * mm, 10 * mm, str(doc.page - 1))
    canvas.restoreState()


doc = BaseDocTemplate(str(out), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=22 * mm, bottomMargin=20 * mm, title="Puppet House — Submission Write-up" if FINAL else "Puppet House — Submission Write-up Draft", author="Puppet House")
cover_frame = Frame(22 * mm, 25 * mm, W - 44 * mm, H - 50 * mm, id="cover")
body_frame = Frame(20 * mm, 20 * mm, W - 40 * mm, H - 42 * mm, id="body")
doc.addPageTemplates([PageTemplate(id="all", frames=[cover_frame], onPage=decorate)])
story = []

# Cover
story += [Spacer(1, 28 * mm), Paragraph("<font color='#FF6B57'>PUPPET</font><br/><font color='#FFFFFF'>HOUSE</font>", ParagraphStyle("CoverTitle", fontName="Helvetica-Bold", fontSize=55, leading=48)), Spacer(1, 12 * mm)]
story += [Paragraph("<font color='#D7F477'>AI contestants. Human puppeteers.<br/>Hidden agendas.</font>", ParagraphStyle("CoverTag", fontName="Helvetica", fontSize=17, leading=23)), Spacer(1, 15 * mm)]
story += [Paragraph("<font color='#D5CCD8'>A real-time, chat-driven reality-show strategy game.<br/>Create an autonomous contestant. Keep your secrets.<br/>Try to control the chaos with only three whispers.</font>", ParagraphStyle("CoverBody", fontName="Helvetica", fontSize=11, leading=18)), Spacer(1, 24 * mm)]
cover_meta = (
    "<font color='#FF6B57'><b>GAMING &amp; LIVE STREAMS</b></font><br/><br/>"
    f"<font color='#A99DAC'>Public app: {metadata('Public app')}<br/>"
    f"Repository: {metadata('Repository')}<br/>"
    f"Demo video: {metadata('Demo video')}<br/>"
    f"Nexconn App Key: {metadata('Nexconn App Key')}</font>"
)
story += [Paragraph(cover_meta, ParagraphStyle("CoverMeta", fontName="Helvetica", fontSize=8.5, leading=13))]
cover_note = ("<b>VERIFIED PUBLIC BUILD</b><br/>Nexconn group reception and direct sends, PostgreSQL, Groq dialogue, and core gameplay tested on the public app."
              if FINAL else "<b>DRAFT</b><br/>Credential verification and final links are required before submission.")
story += [Spacer(1, 10 * mm), Paragraph("<font color='#D5CCD8'>" + cover_note + "</font>", ParagraphStyle("Draft", fontName="Helvetica", fontSize=9, leading=13, backColor=colors.HexColor("#251D26"), borderPadding=10)), PageBreak()]


# Replace frame after cover through a page template with both frames is not automatic;
# use a NextPageTemplate-like explicit frame change via a second template.
doc.addPageTemplates([PageTemplate(id="body", frames=[body_frame], onPage=decorate)])
from reportlab.platypus import NextPageTemplate
story.insert(-1, NextPageTemplate("body"))

lines = source.splitlines()
# Skip source title/tagline/metadata already represented on cover.
start = next(i for i, line in enumerate(lines) if line.startswith("## The one-line pitch"))
for raw in lines[start:]:
    line = raw.strip()
    if not line:
        story.append(Spacer(1, 2))
        continue
    if line.startswith("### "):
        story.append(Paragraph(inline(line[4:]), h2))
    elif line.startswith("## "):
        story.append(Paragraph(inline(line[3:]), h1))
    elif line.startswith("> "):
        story.append(Paragraph(inline(line[2:]), callout))
    elif re.match(r"^[-*] ", line):
        story.append(Paragraph("• " + inline(line[2:]), bullet))
    elif re.match(r"^\d+\. ", line):
        number, text = line.split(". ", 1)
        story.append(Paragraph(f"<b>{number}.</b> " + inline(text), bullet))
    else:
        story.append(Paragraph(inline(line), body))

doc.build(story)
print(out)
