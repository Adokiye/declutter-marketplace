#!/usr/bin/env python3
"""Generate a Word .docx (no external deps) for Declutter's cost & pricing model."""
import zipfile, html, os

def esc(t): return html.escape(str(t), quote=True)

def h(text, level=1):
    return f'<w:p><w:pPr><w:pStyle w:val="Heading{level}"/></w:pPr><w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'

def title(text, sub=""):
    out = f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'
    if sub:
        out += f'<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t xml:space="preserve">{esc(sub)}</w:t></w:r></w:p>'
    return out

def p(text, bold=False, italic=False):
    rpr = ""
    if bold or italic:
        rpr = "<w:rPr>" + ("<w:b/>" if bold else "") + ("<w:i/>" if italic else "") + "</w:rPr>"
    return f'<w:p><w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'

def bullet(text):
    return (f'<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
            f'<w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>')

def cell(text, bold=False, width=2400, shade=None):
    rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
    tcpr = f'<w:tcW w:w="{width}" w:type="dxa"/>'
    if shade:
        tcpr += f'<w:shd w:val="clear" w:fill="{shade}"/>'
    return (f'<w:tc><w:tcPr>{tcpr}</w:tcPr>'
            f'<w:p><w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p></w:tc>')

def table(rows, widths=None, header=True):
    borders = ('<w:tblBorders>' + ''.join(
        f'<w:{s} w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>'
        for s in ["top","left","bottom","right","insideH","insideV"]) + '</w:tblBorders>')
    out = f'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>{borders}</w:tblPr>'
    for i, row in enumerate(rows):
        cells = ""
        for j, c in enumerate(row):
            w = (widths[j] if widths else 2400)
            cells += cell(c, bold=(i==0 and header), width=w, shade=("F0EAE2" if (i==0 and header) else None))
        out += f'<w:tr>{cells}</w:tr>'
    return out + '</w:tbl>' + p("")

body = []
body.append(title("Declutter — Cost-to-Run & Business Pricing Model",
                  "Financial model and recommended pricing · June 2026 · all figures in Naira (₦)"))

body.append(h("1. Executive summary", 1))
body.append(p("Declutter is a Lagos peer-to-peer resale marketplace that imports sellers' Instagram catalogues, "
              "publishes them with escrow-protected or commission-only checkout, and notifies businesses on WhatsApp "
              "and email when an order is paid. This document sizes what it costs to run the platform and recommends "
              "how to charge the businesses (sellers) that use it."))
body.append(bullet("Run cost is low to start: a lean setup runs about ₦305,000/month excluding a salaried developer "
                   "(≈ ₦705,000/month if you pay one mid-level dev)."))
body.append(bullet("Charge primarily a transaction commission (recommended default 7.5%), with optional monthly "
                   "subscription tiers for sellers who want Instagram auto-import, analytics and lower commission."))
body.append(bullet("Commission-only checkout is materially cheaper to process than escrow, because payment-processor "
                   "fees are charged on the smaller amount (just the commission) rather than the full item value."))

body.append(h("2. Assumptions", 1))
body.append(table([
    ["Assumption", "Value used", "Basis"],
    ["FX rate", "₦1,500 / US$1", "Buffer above the ~₦1,360 official and ~₦1,400 parallel June 2026 rates"],
    ["Payment processor (Paystack/Bani)", "1.5% + ₦100, capped ₦2,000; ₦100 waived under ₦2,500; +7.5% VAT on the fee", "Paystack Nigeria card pricing"],
    ["WhatsApp order alert (utility template)", "≈ ₦45 / message", "Meta utility-template rate ~US$0.02–0.05"],
    ["Email (Resend)", "Free to 3,000/mo, then ~₦30,000/mo", "Resend pricing"],
    ["AI (DeepSeek) per listing", "≈ ₦0.30 (caption parse + deal score)", "DeepSeek token pricing — negligible"],
    ["Image CDN (Cloudinary)", "Free tier early; ~₦135,000/mo at scale", "Cloudinary Plus ≈ US$89"],
], widths=[2600, 3200, 3200], header=True))

body.append(h("3. Monthly cost to run", 1))
body.append(p("Two scenarios: a lean early-stage setup, and a growth setup with a small team and real traffic. "
              "Payment-processor and messaging fees are variable (they scale with orders) and are shown separately as "
              "unit costs in section 4."))

body.append(h("3a. Lean / MVP (early stage)", 2))
body.append(table([
    ["Item", "Monthly (₦)", "Notes"],
    ["Hosting — API + worker + Postgres + Redis", "120,000", "Render/Railway, ~US$50–80"],
    ["Image CDN (Cloudinary)", "0", "Free tier"],
    ["WhatsApp + email notifications", "15,000", "Low volume"],
    ["AI (DeepSeek)", "5,000", "Listing parsing + deal scoring"],
    ["Ops / community manager", "150,000", "Moderation, seller onboarding"],
    ["Domain, SSL, tools, misc", "15,000", ""],
    ["Subtotal (excl. founder salary)", "305,000", "Founder/dev as sweat equity"],
    ["+ One mid-level developer (optional)", "400,000", "If not founder-built"],
    ["Total with paid dev", "705,000", ""],
], widths=[3400, 2200, 3200], header=True))

body.append(h("3b. Growth (small team + traffic)", 2))
body.append(table([
    ["Item", "Monthly (₦)", "Notes"],
    ["Infrastructure (scaled)", "300,000", "Bigger instances, backups, monitoring"],
    ["Image CDN (Cloudinary Plus)", "135,000", "Higher media volume"],
    ["Comms (WhatsApp + email at volume)", "80,000", ""],
    ["AI (DeepSeek)", "30,000", ""],
    ["Senior developer", "800,000", "Lagos senior ~₦800k–1.5M/mo"],
    ["Mid developer", "400,000", ""],
    ["Operations lead", "250,000", ""],
    ["Customer support", "150,000", ""],
    ["Marketing / growth", "500,000", "Paid social, referrals"],
    ["Legal, accounting, misc", "100,000", ""],
    ["Total", "2,745,000", ""],
], widths=[3400, 2200, 3200], header=True))

body.append(h("4. Unit economics per order", 1))
body.append(p("Example: a ₦100,000 item at a 7.5% commission (₦7,500). The platform's cost to process one order "
              "differs sharply by checkout mode:"))
body.append(table([
    ["Per ₦100,000 order @ 7.5%", "Commission-only", "Escrow (item + commission)"],
    ["Amount charged online", "₦7,500", "₦107,500"],
    ["Processor fee (1.5% + ₦100 +VAT)", "≈ ₦228", "≈ ₦2,150 (capped)"],
    ["WhatsApp + email alert", "≈ ₦45", "≈ ₦45"],
    ["AI / misc", "≈ ₦1", "≈ ₦1"],
    ["Net commission kept", "≈ ₦7,226", "≈ ₦5,304"],
], widths=[3400, 2600, 2800], header=True))
body.append(p("Takeaway: commission-only is the right platform default (it already is) — it keeps ~36% more of each "
              "commission than escrow, and escrow's processor fee is capped at ₦2,000 so it hurts most on high-value items.",
              italic=True))

body.append(h("5. What to charge businesses, and how", 1))
body.append(p("Benchmark: Jumia charges 5–15% commission by category; Jiji charges 0% commission (paid listings only). "
              "Declutter sits between them — a modest commission justified by Instagram auto-import, escrow/buyer "
              "protection, and instant WhatsApp order alerts that classifieds don't offer."))
body.append(p("Recommended model — a hybrid of commission (primary) + optional subscription:", bold=True))
body.append(bullet("Primary: a transaction commission of 7.5% (default), charged to the buyer at checkout in commission-only mode."))
body.append(bullet("Optional subscription tiers for sellers who want automation and a lower commission."))
body.append(bullet("À-la-carte add-ons: featured placement and one-time Instagram onboarding."))

body.append(h("5a. Subscription tiers (Naira)", 2))
body.append(table([
    ["Tier", "Price /mo", "Commission", "Includes"],
    ["Starter", "₦0", "7.5%", "Manual listing, escrow/commission checkout, WhatsApp order alerts"],
    ["Growth", "₦15,000", "6%", "Instagram auto-import, up to 100 live listings, priority moderation, basic analytics"],
    ["Pro", "₦45,000", "5%", "Unlimited IG sync, featured placement credits, full analytics, dedicated support"],
], widths=[1600, 1700, 1700, 4200], header=True))

body.append(h("5b. Add-ons", 2))
body.append(table([
    ["Add-on", "Price", "Notes"],
    ["Featured listing", "₦2,000 / listing / week", "Top of category + home rows"],
    ["Instagram onboarding (one-time)", "₦25,000", "Account connect + first bulk import + cleanup"],
    ["Bulk import top-up", "₦5,000 / 100 posts", "Beyond tier limits"],
], widths=[3400, 2600, 3000], header=True))

body.append(h("6. Break-even", 1))
body.append(p("Using net commission of ≈ ₦7,226 per ₦100,000 commission-only order:"))
body.append(bullet("Lean setup (₦305,000/mo fixed): break-even ≈ 43 orders/month."))
body.append(bullet("Lean + paid dev (₦705,000/mo): break-even ≈ 98 orders/month."))
body.append(bullet("Growth setup (₦2.745M/mo): break-even ≈ 380 orders/month on commission alone — fewer once subscription revenue is added."))
body.append(p("Subscriptions improve the picture quickly: 50 Growth sellers (₦15,000) + 10 Pro (₦45,000) = ₦1.2M/mo of "
              "recurring revenue before any commission, covering ~44% of the growth-stage cost base.", italic=True))

body.append(h("7. Notes & caveats", 1))
body.append(bullet("Variable costs (processor + WhatsApp) scale with order volume — they are not in the fixed monthly tables."))
body.append(bullet("USD-priced vendors (Cloudinary, hosting, AI) move with the naira; the ₦1,500/US$ buffer absorbs swings."))
body.append(bullet("WhatsApp utility templates are free inside a 24-hour customer window; only out-of-window business-initiated alerts are billed."))
body.append(bullet("Figures are planning estimates for June 2026; confirm live vendor quotes before committing budgets."))

body.append(h("Sources", 1))
for s in [
    "Paystack pricing — paystack.com/pricing; support.paystack.com/en/articles/2130306",
    "Naira/USD June 2026 — tradingeconomics.com/nigeria/currency; vanguardngr.com",
    "WhatsApp Business Platform pricing — developers.facebook.com/docs/whatsapp/pricing; naijatechguide.com",
    "Developer salaries Lagos — worldsalaries.com; payscale.com",
    "Marketplace commissions — vendorhub.jumia.com.ng/commissions; qshop.tech",
    "Hosting costs — render.com/pricing; railway.com/pricing; northflank.com",
]:
    body.append(bullet(s))

document = (
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
'<w:body>' + "".join(body) +
'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/></w:sectPr>'
'</w:body></w:document>')

content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
'<Default Extension="xml" ContentType="application/xml"/>'
'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
'<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
'</Types>')

rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
'</Relationships>')

doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
'</Relationships>')

def style(sid, name, sz, bold, color, spacing_before=240, based=None, qf=True):
    rpr = f'<w:rPr><w:sz w:val="{sz}"/>' + ("<w:b/>" if bold else "") + (f'<w:color w:val="{color}"/>' if color else "") + '</w:rPr>'
    return (f'<w:style w:type="paragraph" w:styleId="{sid}"><w:name w:val="{name}"/>'
            f'<w:pPr><w:spacing w:before="{spacing_before}" w:after="80"/></w:pPr>{rpr}</w:style>')

styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
+ style("Title","Title",52,True,"6F4E37",0)
+ style("Subtitle","Subtitle",24,False,"7A7A7A",0)
+ style("Heading1","heading 1",32,True,"6F4E37",360)
+ style("Heading2","heading 2",26,True,"3D2B22",240)
+ '</w:styles>')

numbering = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
'<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>'
'<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
'<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>')

out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Declutter_Pricing_and_Cost_Model.docx")
with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/document.xml", document)
    z.writestr("word/_rels/document.xml.rels", doc_rels)
    z.writestr("word/styles.xml", styles)
    z.writestr("word/numbering.xml", numbering)
print("wrote", out_path)
