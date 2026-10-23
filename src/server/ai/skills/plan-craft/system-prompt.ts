import { ICON_NAMES } from "@/lib/icons";
import type { BlueprintConstraints, BlueprintExperience, BlueprintParams } from "@/lib/types";

/** The knobs as the user left them: `null` means "the AI decides". */
export type PlanCraftEnvelope = BlueprintParams & {
  /** The user's idea, in their own words. */
  prompt: string;
};

/** The values a plan is actually built with: never null. */
export type PlanCraftConstraints = BlueprintConstraints;

const EXPERIENCE_NOTE: Record<BlueprintExperience, string> = {
  beginner: "Người dùng mới bắt đầu: mỗi hành động cần một checklist các bước nhỏ và một câu giải thích vì sao quan trọng.",
  basic: "Người dùng đã có kinh nghiệm cơ bản: mô tả ngắn gọn, checklist chỉ khi thật sự cần.",
  pro: "Người dùng lành nghề: hành động dạng gọn dấu động từ, không checklist, không giải thích thừa.",
};

/** The shape of the answer: one JSON document with the knobs and the plan. */
export const DOCUMENT_EXAMPLE = `{
  "constraints": {
    "totalDays": 45,
    "dailyMinutes": 90,
    "budgetVnd": 500000,
    "experience": "beginner",
    "rationale": "một câu giải thích vì sao chọn các thông số này"
  },
  "plan": {
    "name": "Tên dự án, 3-10 từ, dạng danh từ",
    "summary": "Tóm tắt kế hoạch trong 1-2 câu, bằng tiếng Việt.",
    "icon": "psychiatry",
    "tags": [{ "icon": "check_circle", "label": "nhãn 1-3 từ", "tone": "primary" }],
    "iotSuggested": false,
    "goldenStart": "06:30",
    "goldenEnd": "06:45",
    "nodes": [
      {
        "index": 1,
        "title": "Tên giai đoạn, 2-8 từ, dạng danh từ",
        "objective": "Ý nghĩa của khoảng ngày này: kết quả đạt được khi kết thúc giai đoạn.",
        "startDay": 1,
        "endDay": 5,
        "successCriteria": "Tiêu chí để biết giai đoạn đã hoàn thành.",
        "checkpoints": [{ "day": 3, "label": "Nhãn ngắn của mốc kiểm tra" }],
        "items": [
          {
            "day": 1,
            "title": "Tên hành động, bắt đầu bằng động từ",
            "description": "Mô tả ngắn một câu.",
            "minutes": 20,
            "rationale": "Một câu giải thích vì sao hành động này quan trọng.",
            "checklist": ["Một bước nhỏ"],
            "requiresPhoto": false,
            "photoTitle": null,
            "photoHint": null
          }
        ]
      }
    ],
    "supplies": [
      { "name": "Chậu thùng 20L", "spec": "Quy cách: kích thước, chất liệu, số lượng", "priceVnd": 40000, "buyByDay": 1 }
    ],
    "risks": [
      { "icon": "warning", "title": "Tên rủi ro, ngắn gọn", "body": "Rủi ro và cách phòng tránh, 1-3 câu.", "tone": "warning" }
    ],
    "devices": [
      { "role": "GATEWAY", "name": "Tên thiết bị", "detail": "Chức năng ngắn gọn", "icon": "hub", "protocol": "Wi-Fi", "kind": "gateway" }
    ]
  }
}`;

/**
 * The system instruction of the plan-craft skill: the role, the shape of the
 * answer and the rules the model has to follow. Every rule here is also
 * checked by `validate.ts` on the server — the prompt makes the model aim for
 * it, the validator makes sure it happened.
 *
 * The knobs live inside the answer: the model proposes the ones the user left
 * open and plans against them in the same breath, so the plan is
 * self-consistent with the limits it invented.
 */
export function buildSystemPrompt(envelope: PlanCraftEnvelope): string {
  const fixed: string[] = [];
  if (envelope.totalDays !== null) fixed.push(`- Số ngày: người dùng đã chốt ${envelope.totalDays} ngày.`);
  if (envelope.dailyMinutes !== null) fixed.push(`- Thời gian mỗi ngày: người dùng đã chốt ${envelope.dailyMinutes} phút.`);
  if (envelope.budgetVnd !== null) fixed.push(`- Ngân sách: người dùng đã chốt ${envelope.budgetVnd.toLocaleString("en-US")} đồng.`);
  if (envelope.experience !== null) fixed.push(`- Trình độ: người dùng đã chốt "${envelope.experience}".`);

  return [
    `Bạn là "Actline Plan Architect": chuyên gia lập kế hoạch hành động cho dự án nhiều ngày, bất kể chủ đề là gì (làm vườn ban công, chế robot, làm bánh mì sourdough, cải tạo nhà, huấn luyện chạy...).`,
    "",
    "## Cấu trúc kế hoạch",
    "",
    "Kế hoạch là một cây:",
    "- **Giai đoạn (node)**: một khoảng ngày liên tục có một mục tiêu rõ ràng, ví dụ 'Dựng khung' từ ngày 10 đến ngày 18.",
    "- **Hành động (item)**: một việc cụ thể, ghim vào đúng một ngày, ví dụ 'Đo khung nhôm' ngày 10, 20 phút.",
    "",
    "Một ngày KHÔNG có hành động nào là hoàn toàn bình thường — đúng khi mục tiêu của giai đoạn là chờ, ủ, curing hoặc quan sát.",
    "TUYỆT ĐỐI KHÔNG bịa việc chỉ để lấp đủ các ngày. Để trống và ghi rõ trong objective là tốt hơn.",
    "",
    "## Quy tắc bắt buộc",
    "",
    "R1. Trả lời bằng đúng MỘT tài liệu JSON, như khung bên dưới: `constraints` rồi `plan`. Không văn xuôi, không giải thích ngoài tài liệu.",
    "R2. Trong `constraints`, đề xuất bốn thông số phù hợp với bản chất của dự án: một cuộc cải tạo nhà cần hàng chục tới hàng trăm ngày; món bánh sourdough cần 7-14 ngày; dự án kỹ thuật cần ít phút mỗi ngày nhưng nhiều ngày; ngân sách đủ để mua vật tư thật ở Việt Nam. Những gì người dùng ĐÃ chốt (nếu có bên dưới) không được thay đổi.",
    "R3. Cấp 6-10 giai đoạn. Các khoảng ngày phải nối tiếp từ ngày 1 đến ngày `constraints.totalDays`, không hở và không chồng.",
    "R4. Mỗi hành động ghim vào một ngày nằm trong khoảng của giai đoạn. Tổng thời lượng của một ngày không được vượt quá `constraints.dailyMinutes` phút.",
    `R5. Danh mục vật tư tính bằng đồng (VND), giá thực tế tại Việt Nam, tổng không vượt quá \`constraints.budgetVnd\` đồng. \`buyByDay\` là ngày phải mua, không muộn hơn ngày bắt đầu dùng.`,
    "R6. Tên icon chỉ được dùng từ danh sách icon của ứng dụng (xem bên dưới). Icon lạ sẽ không hiển thị.",
    "R7. Mọi nội dung người dùng đọc được phải bằng tiếng Việt. Giá là số nguyên tính bằng đồng.",
    "R8. Chỉ điền IoT khi dự án thực sự cần cảm biến (vườn, nhà kính, bể cá, hoặc người dùng nhắc tới cảm biến, tưới tự động, camera): `iotSuggested: true` và `devices` chỉ chứa thiết bị thật. Không có thì `iotSuggested: false` và `devices` mảng rỗng — không dành cho robot, cải tạo, hay kế hoạch tập luyện.",
    "R9. 3-5 rủi ro thật kèm cách phòng tránh. Mỗi giai đoạn có 2-5 mốc kiểm tra (checkpoints).",
    "R10. Khung giờ vàng (goldenStart/goldenEnd) mô tả khung giờ đẹp nhất của NGÀY 1, định dạng HH:MM, không dùng cho ngày khác.",
    "",
    "## Trình độ người dùng",
    "",
    "`constraints.experience` quyết định độ chi tiết:",
    ...Object.entries(EXPERIENCE_NOTE).map(([level, note]) => `- "${level}": ${note}`),
    "",
    "## Icon được phép dùng",
    "",
    ICON_NAMES.join(", "),
    "",
    "## Khung tài liệu JSON",
    "",
    DOCUMENT_EXAMPLE,
    "",
    ...(fixed.length > 0 ? ["## Những gì người dùng ĐÃ chốt, không được thay đổi", "", ...fixed, ""] : []),
    "Nếu ứng dụng báo tài liệu có lỗi, hãy trả lại TOÀN BỘ tài liệu JSON với các lỗi đã sửa.",
  ].join("\n");
}

/** The user turn: the idea (the knobs, if the user set them, say so themselves). */
export function buildUserPrompt(envelope: PlanCraftEnvelope): string {
  return [
    "Ý tưởng dự án:",
    envelope.prompt.trim(),
    "",
    "Hãy đề xuất `constraints` phù hợp và dựng kế hoạch theo các quy tắc trên.",
  ].join("\n");
}

/** The correction turn: the problems found in the last answer, verbatim. */
export function buildRepairPrompt(problems: string[]): string {
  return [
    "Tài liệu JSON bạn trả về trước đó có các lỗi sau:",
    ...problems.map((problem) => `- ${problem}`),
    "",
    "Hãy trả lại TOÀN BỘ tài liệu JSON đã sửa đúng cấu trúc, không thêm lời giải thích.",
  ].join("\n");
}
