import { fmtDate } from "@/lib/format";
import type { Client } from "@/types/client";
import type { Building, Contract } from "@/types/contract";

// Fixed bilingual legal clauses, matching the Space IN lease agreement template.
const CLAUSES_EN = [
  "The First Clause: Purpose of the Lease: The First Party's rent to the Second Party who accepts that address mentioned above. It is referred to in this Contract as the Leased Property because it is a workplace and commercial address for the Second Party.",
  "The Second Clause: The Second Party is obligated to pay the rental amount on the due dates indicated in the initial preamble of this Contract to the bank account of the first party. In the event that he fails to pay on the specified date for only one day, this Contract is considered terminated on its own and without the need for warning or excuses and the first party will have the right to claim him in the urgent court and educate the second party from the office and address, after which the First Party has the right to terminate the Contract. And leasing the office and the commercial address that is the subject of the contract to any other party, after deleting the address of the Second Party from the rented office. This is an acknowledgment by the Second Party of that. Also, the Second Party is not entitled to recover any amounts that it has paid in advance to the First Party for any reason that is not due to the First Party.",
  "The Third Clause: The First Party is obliged to pay all the fees and expenses for electricity, water, basic Wi-Fi internet, furnished Co-Working space with 1 desk, chair and commercial address, provided that the Second Party is obliged to pay the Municipality fees, Value-added Tax, and any other government fees, if any. The Second Party is committed to closing the municipality's account registered at the commercial address immediately after the end of the Contract period if he does not wish to renew, and in the event that it is not closed and the address is changed, the Contract is considered renewed and the renewal amount is considered payable in full. In a clearer sense, the Lease Contract remains valid under the same conditions and the rental value is due as long as the Second Party continues to use the Commercial Address of the First Party with the Ministry of Commerce or the municipality or any government agencies, or the First Party was unable to rent the office's commercial address to another company for a reason attributed to the Second Party or its representatives.",
  "The Fourth Clause: The Second Party does not have the right to use the commercial address of any new commercial registration or other branch other than that registered in the initial preamble to this Contract, nor does it have the right to sublease the commercial address to others or use it for anyone other than the Company's Employees or for a purpose other than for which it was rented without written letter, and in the event that the Second Party violates this Clause or any of the Terms of the Contract, the Contract is considered terminated on its own without the need to provide an excuse, and the First Party has the right to terminate the Contract and renting it to others or resort to Urgent Matters Court.",
  "The Fifth Clause: In the event that the Term of the Contract expires before the request to register the commercial address subject to the Contract is completed by the Company of the Second party, the latter is obligated to cancel the request to register the commercial address and close the electricity account no later than the day following the end of the lease term and he will be committed to pay the rental value from the start date of the contract, and the Second Party authorizes the First Party to represent him before the Ministry of Commerce and the Municipality and all relevant Government agencies to cancel the request. In the event of a violation of this, the Second Party is obligated to pay the full amount of the Contract again as initial compensation to the First Party, while preserving the rights of the First Party to recourse against the Second Party for final compensation for that.",
  "The Sixth Clause: The Second Party acknowledges that the First Party is not responsible for any violation by the Labor Market Regulatory Authority or any other government agency, regardless of the type of this violation, as this Contract is only a rental agreement between the two parties.",
  "The Seventh Clause: The Phone Number and Email registered in the initial preamble of this Contract are considered one of the approved legal matters for communication between the Two Parties. In the event that the Second Party desires to renew the Contract, he is obligated to notify the First Party in writing of his desire to renew or not within at least one month before the expiration of the Contract, or send an Email to Spacein.bh@gmail.com or communicate via WhatsApp with the following number 33246663.",
  "The Eighth Clause: This Contract made from an original and a copy, and each Party was given a copy to work according to it.",
  "The Ninth Clause: Any legal claim related to this agreement it will be through Bahrain courts, and the Arabic language is the interpretation of the texts of this contract in case of any difference in the interpretation of the language.",
];

const CLAUSES_AR = [
  "البند الأول – الغرض من الإيجار : أجر الطرف الأول للطرف الثاني القابل لذلك العنوان التجاري المذكور أعلاه، ويشار إليه في هذا العقد بالعين المؤجرة وذلك لاتخاذه مقر عمل وعنوان تجاري للطرف الثاني.",
  "البند الثاني : يلتزم الطرف الثاني بسداد القيمة الإيجارية في مواعيد استحقاقها الموضحة بالديباجة الأولية من هذا العقد على الحساب البنكي للطرف الأول، وفي حالة تخلفه عن السداد في الموعد المحدد لمدة يوم واحد فقط يعتبر هذا العقد مفسوخاً من تلقاء نفسه ودون الحاجة إلى تنبيه أو إعذار، ويحق للطرف الأول اللجوء للقضاء المستعجل لطرده فوراً، ويحق بعدها للطرف الأول إنهاء العقد وتأجير المكتب والعنوان التجاري موضوع العقد لأي طرف آخر وذلك بعد حذف عنوان الطرف الثاني من المكتب المؤجر وهذا إقرار من الطرف الثاني بذلك، كما أنه لا يحق للطرف الثاني استرجاع أية مبالغ قد سددها مقدماً للطرف الأول لأي سبب لا يرجع للطرف الأول.",
  "البند الثالث : يلتزم الطرف الأول بسداد كافة الرسوم والمصاريف الخاصة بالكهرباء والماء والإنترنت عن طريق الواي فاي وأن يزود الطرف الثاني بمساحة مكتبية مشتركة مؤثثة بمكتب وكرسي وعنوان تجاري على أن يلتزم الطرف الثاني بدفع رسوم البلدية وضريبة القيمة المضافة وأية رسوم حكومية أخرى إن وجدت، ويلتزم الطرف الثاني بإغلاق حساب البلدية المسجل على العنوان التجاري فور انتهاء مدة العقد حال عدم رغبته في التجديد، وفي حال عدم إغلاقه لحساب البلدية وتغيير العنوان يعتبر العقد مجدداً ويعتبر كامل مبلغ التجديد مستحق الدفع، وبمعنى أوضح يظل عقد الإيجار سارياً بذات الشروط والقيمة الإيجارية مستحقة طالما أن الطرف الثاني ظل يستخدم العنوان التجاري للطرف الأول لدى وزارة التجارة أو البلدية أو أياً من الجهات الحكومية أو أن الطرف الأول لم يتمكن من تأجير العنوان التجاري للمكتب لشركة أخرى لسبب يرجع للطرف الثاني أو ممثليه.",
  "البند الرابع : لا يحق للطرف الثاني استخدام العنوان التجاري لأي سجل تجاري جديد أو فرع آخر غير المسجل في الديباجة الأولية لهذا العقد، كما أنه لا يحق له تأجير العنوان التجاري للغير من الباطن أو استخدامه لغير موظفي الشركة أو في غير الغرض المؤجر من أجله بدون موافقة كتابية من الطرف الأول، وفي حالة مخالفة الطرف الثاني لهذا البند أو أياً من بنود العقد يعتبر العقد مفسوخاً من تلقاء نفسه دون الحاجة إلى تنبيه أو إعذار، ويحق للطرف الأول إنهاء العقد وتأجيره للغير أو اللجوء للقضاء المستعجل.",
  "البند الخامس : في حال انتهاء مدة العقد قبل اكتمال طلب تسجيل العنوان التجاري محل العقد على الشركة / الطرف الثاني يلتزم الأخير بإلغاء الطلب الخاص بتسجيل العنوان التجاري وغلق حساب الكهرباء بحد أقصى في اليوم التالي لانتهاء مدة الإيجار مع التزامه بالقيمة الإيجارية منذ تاريخ بداية العقد، ويخول الطرف الثاني الطرف الأول في تمثيله لدى وزارة التجارة والبلدية وجميع الجهات الحكومية ذات الصلة لإلغاء الطلب، وفي حال مخالفة ذلك يلتزم الطرف الثاني بدفع قيمة العقد كاملة مرة أخرى كتعويض مبدئي للطرف الأول، مع حفظ حقوق الطرف الأول في الرجوع على الطرف الثاني بتعويض نهائي عن ذلك.",
  "البند السادس : يقر الطرف الثاني بأن الطرف الأول غير مسؤول عن أي مخالفة من هيئة تنظيم سوق العمل أو أياً من الجهات الحكومية الأخرى أياً كان نوع هذه المخالفة حيث إن هذا العقد ما هو إلا اتفاقية تأجير بين الطرفين حسب شروطها.",
  "البند السابع : يعتبر رقم الهاتف والبريد الإلكتروني المسجل بالديباجة الأولية من هذا العقد هو أحد الوسائل القانونية المعتمدة للتواصل بين الطرفين، وفي حالة رغبة الطرف الثاني بتجديد هذا العقد يلتزم بإخطار الطرف الأول كتابياً برغبته في التجديد من عدمه خلال شهر على الأقل قبل انتهاء موعد العقد، أو إرسال رسالة إلكترونية عبر البريد الإلكتروني Spacein.bh@gmail.com أو التواصل عبر الواتساب بالرقم التالي 33246663.",
  "البند الثامن : حرر هذا العقد من أصل ونسخة وتسلم كل طرف نسخة للعمل بموجبها.",
  "البند التاسع : تختص محاكم البحرين حال وجود نزاع قضائي، وتكون اللغة العربية المفسرة لنصوص هذا العقد حال وجود اختلاف في تفسير اللغة.",
];

function esc(v: string | number | undefined | null): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ordinalDate(d = new Date()): string {
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `${String(day).padStart(2, "0")}${suffix} ${month} ${d.getFullYear()}`;
}

export function buildContractDocument(
  contract: Contract,
  client: Client,
  building: Building | null,
): string {
  const blank = "____________";
  const addr =
    `Office No. (${esc(contract.officeNo)}), ` +
    `Building (${esc(building?.buildingNo || blank)})` +
    (building?.name ? ` - ${esc(building.name)}` : "") +
    ` - Road (${esc(building?.roadNo || blank)}), ` +
    `Block (${esc(building?.blockNo || blank)}), ` +
    `${esc(building?.city || "Manama Center")}.`;

  const clauseRows = CLAUSES_EN.map(
    (en, i) => `
    <tr>
      <td class="en">${esc(en)}</td>
      <td class="ar" dir="rtl">${esc(CLAUSES_AR[i])}</td>
    </tr>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Lease Contract ${esc(contract.contractNo)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Georgia, serif; color:#111; font-size:11px; line-height:1.5; margin:0; }
  .title { text-align:center; font-weight:bold; }
  .title .en { font-size:16px; }
  .title .ar { font-size:16px; }
  .date { text-align:center; margin:6px 0 10px; font-weight:bold; }
  .preamble p { margin:4px 0; }
  .preamble b { font-weight:bold; }
  table.clauses { width:100%; border-collapse:collapse; margin-top:10px; }
  table.clauses td { border:1px solid #333; padding:7px 9px; vertical-align:top; width:50%; }
  td.en { text-align:justify; }
  td.ar { text-align:justify; font-family:"Times New Roman", "Traditional Arabic", serif; font-size:12px; }
  .sig { display:flex; justify-content:space-between; margin-top:26px; font-weight:bold; }
  .sig div { width:45%; text-align:center; border-top:1px solid #333; padding-top:6px; }
  .brand { text-align:center; border-bottom:3px solid #c9a84c; padding-bottom:6px; margin-bottom:8px; }
  .brand .name { font-size:20px; font-weight:900; letter-spacing:1px; color:#0f0e0b; }
  .brand .sub { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:#8a7e6e; }
</style></head>
<body>
  <div class="brand"><div class="name">SPACE IN</div><div class="sub">Business Center</div></div>
  <div class="title"><div class="en">Office Space Lease Contract</div><div class="ar" dir="rtl">عقد إيجار مساحة مكتبية</div></div>
  <div class="date">This Contract is made on ${ordinalDate()} AD.</div>

  <div class="preamble">
    <p><b>Name of the lessor / First Party:</b> SPACE IN BUSINESS CENTER W.L.L. — CR. No. 165431-1 — Contact No. 33246663 — E-mail: Spacein.bh@gmail.com.</p>
    ${
      contract.clientType === "commercial"
        ? `<p><b>Name of the Tenant / Second Party:</b> ${esc(
            client.company || client.name,
          )}${client.rank ? ` — CR. No. ${esc(client.rank)}` : ""}, and the jointly responsible person with the company Mr./Ms. ${esc(
            client.authorizedName || client.name,
          )}${
            client.authorizedNationality
              ? ` – ${esc(client.authorizedNationality)} National`
              : ""
          }${
            client.authorizedCpr
              ? `, holding CPR No. ${esc(client.authorizedCpr)}`
              : ""
          }${client.email ? ` — E-Mail: ${esc(client.email)}` : ""}${
            client.phone ? ` — Contact No. ${esc(client.phone)}` : ""
          }.</p>`
        : `<p><b>Name of the Tenant / Second Party:</b> Mr./Ms. ${esc(
            client.name,
          )}${client.email ? ` — E-Mail: ${esc(client.email)}` : ""}${
            client.phone ? ` — Contact No. ${esc(client.phone)}` : ""
          }.</p>`
    }
    <p><b>Leased Address:</b> ${addr}</p>
    <p><b>Term of the Contract:</b> ${esc(contract.months)} months, starting from ${esc(
      fmtDate(contract.startDate),
    )} and ending on ${esc(fmtDate(contract.endDate))}.</p>
    <p><b>Rental Amount:</b> BD ${esc(contract.monthlyRent)} per Month.</p>
    <p><b>Payment method:</b> To be paid every ${esc(
      contract.paymentMonths || contract.months,
    )} month(s) in advance.</p>
  </div>

  <table class="clauses">${clauseRows}</table>

  <div class="sig">
    <div>Signature of the First Party</div>
    <div>
      Signature of the Second Party${
        contract.clientType === "commercial" &&
        (client.authorizedName || client.name)
          ? `<div style="font-weight:normal;font-size:10px;margin-top:4px;">${esc(
              client.authorizedName || client.name,
            )} — Authorized signatory</div>`
          : ""
      }
    </div>
  </div>
</body></html>`;
}
