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
  beginner:
    "Người dùng mới bắt đầu: mỗi hành động cần một checklist các bước nhỏ và một câu giải thích vì sao quan trọng.",
  basic: "Người dùng đã có kinh nghiệm cơ bản: mô tả ngắn gọn, checklist chỉ khi thật sự cần.",
  pro: "Người dùng lành nghề: hành động dạng gọn dấu động từ, không checklist, không giải thích thừa.",
};

/**
 * The first question: how long, how much time, how much money, how experienced.
 * The answer depends on the topic, so the model proposes it.
 */
export function buildConstraintsPrompt(envelope: PlanCraftEnvelope): string {
  const fixed: string[] = [];
  if (envelope.totalDays !== null) fixed.push(`- Số ngày: người dùng đã chốt ${envelope.totalDays} ngày.`);
  if (envelope.dailyMinutes !== null) fixed.push(`- Thời gian mỗi ngày: người dùng đã chốt ${envelope.dailyMinutes} phút.`);
  if (envelope.budgetVnd !== null) fixed.push(`- Ngân sách: người dùng đã chốt ${envelope.budgetVnd.toLocaleString("en-US")} đồng.`);
  if (envelope.experience !== null) fixed.push(`- Trình độ: người dùng đã chốt "${envelope.experience}".`);

  return [
    `Bạn là "Actline Plan Architect": chuyên gia lập kế hoạch hành động cho dự án nhiều ngày, bất kể chủ đề là gì (làm vườn ban công, chế robot, làm bánh mì sourdough, cải tạo nhà, huấn luyện chạy...).`,
    "",
    "Nhiệm vụ lúc này chỉ là chọn bốn thông số cho kế hoạch. Chúng phụ thuộc vào bản chất của dự án:",
    "- Một cuộc cải tạo nhà cần hàng chục tới hàng trăm ngày; một món bánh sourdough cần 7-14 ngày.",
    "- Dự án kỹ thuật cần ít thời gian mỗi ngày nhưng nhiều ngày; làm vườn cần ngắn mỗi ngày nhưng kéo dài.",
    "- Ngân sách phải đủ để mua vật tư thật ở Việt Nam, không hụt và không thừa.",
    "- Trình độ quyết định độ chi tiết của các bước.",
    "",
    "Gọi tool `propose_constraints` để trả lời. Không viết lời giải thích dài.",
    ...(fixed.length > 0 ? ["", "Những gì người dùng ĐÃ chốt, không được thay đổi:", ...fixed] : []),
  ].join("\n");
}

/** The user turn for the constraints question. */
export function buildConstraintsUserPrompt(envelope: PlanCraftEnvelope): string {
  return ["Ý tưởng dự án:", envelope.prompt.trim(), "", "Hãy đề xuất thông số phù hợp."].join("\n");
}

/**
 * The system instruction of the plan-craft skill: the role, the plan shape and
 * the rules the model has to follow. Every rule here is also checked by
 * `validate.ts` on the server — the prompt makes the model aim for it, the
 * validator makes sure it happened.
 */
export function buildSystemPrompt(constraints: PlanCraftConstraints): string {
  return [
    `Bạn là "Actline Plan Architect": chuyên gia lập kế hoạch hành động cho dự án nhiều ngày, bất kể chủ đề là gì (làm vườn ban công, chế robot, làm bánh mì sourdough, huấn luyện chạy, cải tạo nhà...).`,
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
    `R1. Tạo 6-10 giai đoạn. Các khoảng ngày phải nối tiếp từ ngày 1 đến ngày ${constraints.totalDays}, không hở và không chồng.`,
    `R2. Mỗi hành động ghim vào một ngày nằm trong khoảng của giai đoạn. Tổng thời lượng của một ngày không được vượt quá ${constraints.dailyMinutes} phút.`,
    "R3. Không bịa việc để lấp ngày trống. Ưu tiên để trống rồi nói rõ trong objective.",
    `R4. Danh mục vật tư tính bằng đồng (VND), giá thực tế tại Việt Nam, tổng không vượt quá ${constraints.budgetVnd.toLocaleString("en-US")} đồng.`,
    "R5. Tên icon chỉ được dùng từ danh sách icon của ứng dụng (xem bên dưới). Icon lạ sẽ không hiển thị.",
    "R6. Mọi nội dung người dùng đọc được phải bằng tiếng Việt. Giá là số nguyên tính bằng đồng.",
    "R7. Chỉ gợi ý IoT khi dự án thực sự cần cảm biến (vườn, nhà kính, bể cá, hoặc người dùng nhắc tới cảm biến, tưới tự động, camera). Không gợi ý cho robot, cải tạo, hay kế hoạch tập luyện.",
    "R8. Dự báo 3-5 rủi ro thật kèm cách phòng tránh. Mỗi giai đoạn có 2-5 mốc kiểm tra.",
    "R9. Khung giờ vàng (goldenStart/goldenEnd) mô tả khung giờ đẹp nhất của NGÀY 1, không dùng cho ngày khác.",
    "",
    "## Kinh nghiệm người dùng",
    "",
    EXPERIENCE_NOTE[constraints.experience],
    "",
    "## Icon được phép dùng",
    "",
    ICON_NAMES.join(", "),
    "",
    "## Cách trả lời",
    "",
    "Gọi tool để dựng kế hoạch, đừng mô tả bằng lời. Một lần gọi được nhiều tool song song:",
    "1. `create_node` cho từng giai đoạn, kèm hành động và mốc kiểm tra.",
    "2. `add_supply` cho từng mục vật tư.",
    "3. `add_risk` cho từng rủi ro.",
    "4. `add_device` chỉ khi dự án cần cảm biến.",
    "5. `finalize_plan` để chốt tên, tóm tắt, nhãn, icon và gợi ý IoT.",
    "",
    "Nếu ứng dụng báo một tool call không hợp lệ, hãy gọi lại tool đó với đối số đã sửa.",
  ].join("\n");
}

/** The user turn: the idea plus the constraints the plan is built with. */
export function buildUserPrompt(prompt: string, constraints: PlanCraftConstraints): string {
  return [
    "Ý tưởng dự án:",
    prompt.trim(),
    "",
    "Ràng buộc:",
    `- Tổng thời lượng: ${constraints.totalDays} ngày`,
    `- Thời gian rảnh mỗi ngày: ${constraints.dailyMinutes} phút`,
    `- Ngân sách tối đa: ${constraints.budgetVnd.toLocaleString("en-US")} đồng`,
    "",
    "Hãy dựng kế hoạch theo các quy tắc trên.",
  ].join("\n");
}
