import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top subtle bar
        self.setFillColor(colors.HexColor("#D31411")) # Crimson Red
        self.rect(0, 11 * 72 - 4, 8.5 * 72, 4, fill=1, stroke=0)
        
        # Footer
        self.setFillColor(colors.HexColor("#64748B"))
        self.setFont("Helvetica", 8)
        self.drawString(36, 18, "CricIQ — AI-Powered Live Cricket Companion (Dream11 Assignment Submission)")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 36, 18, page_str)
        self.restoreState()

def create_pdf(filename="CricIQ_Assignment_Submission.pdf"):
    # Target exact 1 page layout: 792 pt height total
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=26,
        bottomMargin=26
    )

    styles = getSampleStyleSheet()

    # Custom palette
    primary_red = colors.HexColor("#D31411")
    dark_navy = colors.HexColor("#0F172A")
    slate_dark = colors.HexColor("#1E293B")
    text_muted = colors.HexColor("#475569")
    card_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")

    # Typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=dark_navy
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=text_muted
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.white,
        alignment=1
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=primary_red,
        spaceBefore=5,
        spaceAfter=3,
        textTransform='uppercase'
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=slate_dark
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    link_style = ParagraphStyle(
        'LinkStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1D4ED8")
    )

    note_box_text = ParagraphStyle(
        'NoteBoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=11,
        textColor=slate_dark
    )

    note_box_heading = ParagraphStyle(
        'NoteBoxHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=11,
        textColor=dark_navy,
        spaceAfter=1
    )

    elements = []

    # Header Table with title and submission status pill
    title_cell = [
        Paragraph("CricIQ — Assignment Submission", title_style),
        Paragraph("AI-Powered Live Match Companion & Fantasy Intelligence | Second-Screen Assistant", subtitle_style)
    ]
    
    status_pill = Table(
        [[Paragraph("PROTOTYPE SUBMISSION", badge_style)]],
        colWidths=[120],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), primary_red),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]
    )

    header_table = Table(
        [[title_cell, status_pill]],
        colWidths=[420, 120],
        style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]
    )
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=5, spaceBefore=3))

    # SECTION 1: WORKING ARTIFACT & PROTOTYPE LINK
    elements.append(Paragraph("1. Working Artifact & Live Prototype Link", section_header_style))
    
    artifact_content = [
        [
            Paragraph("<b>Live Prototype:</b>", body_style),
            Paragraph('<a href="https://criq-for-dream-11.vercel.app/"><font color="#1D4ED8"><u>https://criq-for-dream-11.vercel.app/</u></font></a>', link_style),
            Paragraph("<b>Status:</b> <font color='#16A34A'>Active & Live</font>", body_style)
        ],
        [
            Paragraph("<b>Access & Auth:</b>", body_style),
            Paragraph("Zero setup / keyless evaluator access. Powered by serverless proxy with protected API keys.", body_style),
            Paragraph("<b>Tech Stack:</b> HTML5, CSS3, JS, Vercel", body_style)
        ]
    ]

    artifact_table = Table(
        artifact_content,
        colWidths=[80, 290, 170],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), card_bg),
            ('BOX', (0,0), (-1,-1), 0.75, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#EDF2F7")),
            ('TOPPADDING', (0,0), (-1,-1), 3.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]
    )
    elements.append(artifact_table)
    elements.append(Spacer(1, 5))

    # SECTION 2: POLISHED SUBMISSION NOTE (MAX 200 WORDS)
    elements.append(Paragraph("2. Short Note: Problem, Solution & AI Tools (172 Words)", section_header_style))
    
    note_content = [
        [
            Paragraph("<b>Fan Problem</b>", note_box_heading),
        ],
        [
            Paragraph(
                "Cricket fans face severe cognitive overload during live T20 matches: missing game-changing moments "
                "(DRS reviews, dropped catches), struggling to decipher complex match rules (DLS calculations, umpire's call, powerplay restrictions), "
                "and failing to evaluate live Dream11 fantasy point swings from static scorecards.",
                note_box_text
            )
        ],
        [
            Paragraph("<b>How CricIQ Helps</b>", note_box_heading),
        ],
        [
            Paragraph(
                "CricIQ serves as an intelligent second-screen companion transforming raw feeds into contextual understanding:<br/>"
                "&bull; <b>Grounded AI Insights:</b> Explains key moments in plain English (<i>'What Happened?'</i>), catches up late joiners in seconds (<i>'Catch Me Up'</i>), and answers ad-hoc queries (<i>'Ask Anything'</i>).<br/>"
                "&bull; <b>Fantasy & Rules Grounding:</b> Real-time match data is strictly grounded with the Dream11 scoring matrix (batting/bowling/fielding bonus points) and cricket rulebooks to deliver clear captaincy guidance and momentum shifts.<br/>"
                "&bull; <b>Interactive Simulation:</b> Dynamic ball-by-ball timeline, live commentary, and multi-match coverage (live, upcoming, completed, and interactive demo).",
                note_box_text
            )
        ],
        [
            Paragraph("<b>AI Tools Used</b>", note_box_heading),
        ],
        [
            Paragraph(
                "&bull; <b>Google Gemini 3.1 Flash Lite:</b> Primary high-throughput inference engine for real-time explanations, summaries, and Q&A.<br/>"
                "&bull; <b>Groq (openai/gpt-oss-120b):</b> Automatic ultra-low-latency fallback if Gemini hits rate limits.<br/>"
                "&bull; <b>Vercel Serverless Architecture:</b> Secure server-side proxy guaranteeing zero client credential exposure.",
                note_box_text
            )
        ]
    ]

    note_table = Table(
        note_content,
        colWidths=[540],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FAFAFA")),
            ('BOX', (0,0), (-1,-1), 0.75, border_color),
            ('LINELEFT', (0,0), (0,-1), 2.5, primary_red),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 9),
            ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ]
    )
    elements.append(note_table)
    elements.append(Spacer(1, 5))

    # SECTION 3: KEY PRODUCT CAPABILITIES & ARCHITECTURE HIGHLIGHTS
    elements.append(Paragraph("3. Product Capabilities & Value-Add Architecture", section_header_style))

    feature_data = [
        [
            Paragraph("Feature / Capability", th_style),
            Paragraph("Implementation Details & User Experience", th_style),
            Paragraph("Dream11 Value & Strategic Fit", th_style),
        ],
        [
            Paragraph("<b>Instant Moment Breakdown</b><br/><font color='#64748B'>'What Happened?'</font>", body_style),
            Paragraph("Synthesizes recent deliveries into plain narrative, demystifying DRS ball-tracking, LBW impact, and dismissals.", body_style),
            Paragraph("Immediate clarity on bowling bonuses, wicket points, and maiden overs.", body_style)
        ],
        [
            Paragraph("<b>Contextual Match Catch-Up</b><br/><font color='#64748B'>'Catch Me Up'</font>", body_style),
            Paragraph("Provides late-joining users an immediate tactical summary: phase run rates, standout performers, and momentum shifts.", body_style),
            Paragraph("Empowers users to track their chosen XI's trajectory and evaluate captaincy choices.", body_style)
        ],
        [
            Paragraph("<b>Rules & Fantasy Engine</b><br/><font color='#64748B'>'Ask Anything'</font>", body_style),
            Paragraph("Grounded Q&A using official ICC/IPL playing conditions (DLS, Super Over, powerplays) and real-time match context.", body_style),
            Paragraph("Answers complex fantasy scoring queries (strike-rate penalties, boundary milestones).", body_style)
        ],
        [
            Paragraph("<b>Dual-Provider Architecture</b><br/><font color='#64748B'>Production Resilience</font>", body_style),
            Paragraph("Redundant LLM pipeline with automated failover (Gemini &rarr; Groq) ensuring high availability without timeouts.", body_style),
            Paragraph("Enterprise security posture: zero API keys exposed in browser bundle.", body_style)
        ]
    ]

    feature_table = Table(
        feature_data,
        colWidths=[125, 260, 155],
        style=[
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
            ('BOX', (0,0), (-1,-1), 0.75, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, card_bg]),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]
    )
    elements.append(feature_table)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {filename}")

if __name__ == "__main__":
    create_pdf()
