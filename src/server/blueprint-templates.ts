import "server-only";

/**
 * Content library for the "new project" engine.
 *
 * A template is a complete, hand-written plan for one kind of project. The generator
 * (services/blueprint.ts) picks the closest template, then rescales it to the user's
 * duration, daily time, budget and experience. Everything here is engine content, the
 * same way seeded project content is content and not UI chrome.
 */

export type TemplateTag = { icon: string; label: string; tone: "primary" | "secondary" | "tertiary" };

export type TemplateStep = {
  title: string;
  description: string;
  minutes: number;
  rationale: string | null;
  microSteps: string[];
  requiresPhoto: boolean;
  photoTitle: string | null;
  photoHint: string | null;
};

export type TemplateSupply = {
  name: string;
  spec: string;
  priceVnd: number;
  buyByDay: number;
  urgency: "now" | "soon" | "later";
};

export type TemplateRisk = {
  icon: string;
  title: string;
  body: string;
  tone: "warning" | "danger";
};

export type TemplateDevice = {
  role: string;
  name: string;
  detail: string;
  icon: string;
  protocol: string;
  tone: "primary" | "secondary";
  kind: "gateway" | "soil_probe" | "valve" | "camera";
};

export type BlueprintTemplate = {
  key: string;
  /** Lowercase keywords used to match a free-text prompt to this template. */
  keywords: string[];
  name: string;
  summary: string;
  icon: string;
  tags: TemplateTag[];
  phases: { title: string; summary: string; tasks: string[] }[];
  milestoneCounts: number[];
  dayTitle: string;
  daySummary: string;
  goldenStart: string | null;
  goldenEnd: string | null;
  steps: TemplateStep[];
  supplies: TemplateSupply[];
  risks: TemplateRisk[];
  devices: TemplateDevice[];
  iotSuggested: boolean;
};

const GARDEN: BlueprintTemplate = {
  key: "garden",
  keywords: ["dưa", "dưa leo", "cà chua", "rau", "trồng", "vườn", "ban công", "thủy canh", "cây", "hoa", "orchid", "nấm"],
  name: "Vườn Dưa Leo Baby Ban Công Nhật Bản (Thủy Thổ Hữu Cơ)",
  summary:
    "Mô hình 5 gốc dưa leo giàn A hướng Đông. Quy trình vi sinh khép kín sử dụng xơ dừa lên men và phân trùn quế ép viên, tối ưu nắng sớm 4 tiếng/ngày.",
  icon: "psychiatry",
  tags: [
    { icon: "location_on", label: "Ban công 3.5m²", tone: "primary" },
    { icon: "wb_sunny", label: "Nắng hướng Đông", tone: "secondary" },
    { icon: "eco", label: "100% Thuần sinh học", tone: "primary" },
  ],
  phases: [
    {
      title: "Làm đất, ủ hạt & Gieo mầm",
      summary: "Xử lý giá thể khử nấm, ủ hạt nứt nanh và kiểm soát độ ẩm khay ươm bóng râm.",
      tasks: [
        "Ngâm xả xơ dừa, đo EC nước tưới dưới 0.5 mS/cm",
        "Ứng hạt 4 tiếng ở 45-50°C, loại hạt rỗng ruột",
        "Trộn 70% xơ dừa + 30% phân trùn quế, chia 6 bầu ươm 8x8cm",
        "Gieo hạt sâu 1cm, phủ rơm, tưới xịt nhẹ",
      ],
    },
    {
      title: "Cây con, leo giàn & Tỉa chồi",
      summary: "Sang chậu 20L, dựng giàn chữ A góc 75°, bấm ngọn nhánh phụ từ nách lá thứ 1 đến 5.",
      tasks: [
        "Cấy mầm sang chậu 20L khi có 2 lá thật",
        "Dựng cọc thép phi 11 và lưới leo 15x15cm cao 1.8m",
        "Buộc dây leo bằng kẹp nhẹ, không siết vào thân",
        "Bấm ngọn khi có 5-6 lá thật để kích hoa",
      ],
    },
    {
      title: "Kích hoa, thụ phấn & Neo quả",
      summary: "Tăng Kali hữu cơ, thụ phấn trợ lực buổi sáng (7h-9h30) và tỉa chồi nách mắt lá 1-5.",
      tasks: [
        "Giảm đạm, tăng Kali hữu cơ từ khi ra nụ",
        "Thụ phấn trợ lực trong khung 7h00-9h30",
        "Tỉa chồi nách mắt lá 1-5 để thông gió",
        "Buộc chùm hoa sau khi quả đạt 2cm",
      ],
    },
    {
      title: "Nuôi quả ngọt, bọc trái & Thu hoạch",
      summary: "Thu hái dưa sáng sớm khi đạt chiều dài 12-14cm, tiếp tục dưỡng dây kéo dài đợt 2.",
      tasks: [
        "Tưới chuối mỗi 3 ngày, giữ ẩm 55-65%",
        "Bọc túi lưới chống ruồi vàng đục quả",
        "Thu hái sáng sớm khi quả đạt 12-14cm",
        "Kéo dài đợt 2 bằng cách nhặt quả non đều",
      ],
    },
  ],
  milestoneCounts: [4, 5, 6, 3],
  dayTitle: "Làm đất, ủ hạt & Gieo mầm",
  daySummary: "Xử lý giá thể khử nấm, ủ hạt nứt nanh và gieo mầm vào khay ươm bóng râm.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Ngâm ủ hạt giống dưa leo baby trong nước ấm 2 sôi 3 lạnh",
      description:
        "Chuẩn bị nước pha tỉ lệ (nhiệt độ ~45°C - 50°C), ngâm ngập 8 hạt giống (dự phòng 3 hạt kẹ) trong 4 tiếng.",
      minutes: 15,
      rationale:
        "Nhiệt độ ấm kích hoạt enzyme phá vỡ trạng thái ngủ sâu của vỏ hạt dưa, nâng tỉ lệ nảy mầm từ 60% lên trên 92% trong khí hậu nhà phố.",
      microSteps: [
        "Pha 200ml nước sôi với 300ml nước lọc nguội vào ly thủy tinh sạch.",
        "Thả hạt vào, hạt nào nổi sau 10 phút dùng tăm ấn chìm hoặc loại bỏ nếu rỗng ruột.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Phối trộn giá thể khay ươm (Xơ dừa đã xử lý chát + Phân trùn quế)",
      description: "Trộn theo tỉ lệ 70% mụn dừa ngậm ẩm + 30% trùn quế sàng mịn. Chia đều vào 6 bầu ươm 8x8cm.",
      minutes: 40,
      rationale:
        "Phân trùn quế bổ sung vi sinh cố định đạm giúp bộ rễ hình thành nhanh hơn 3-4 ngày so với mụn dừa thuần trong điều kiện ban công hướng Đông.",
      microSteps: [
        "Vắt nhẹ xơ dừa đã ngâm xả cho khô, đo EC bằng máy đo EC.",
        "Rải trùn quế theo tỉ lệ 30%, trộn đều tay trước khi đổ vào bầu.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh kiểm tra độ ẩm giá thể",
      photoHint: "Nắm chặt tay giá thể không chảy nước rỉ kẽ ngón tay là đạt chuẩn.",
    },
  ],
  supplies: [
    { name: "Hạt giống dưa leo baby F1 Nhật", spec: "Gói 10 hạt · Tỉ lệ nảy mầm >90%", priceVnd: 35_000, buyByDay: 1, urgency: "now" },
    { name: "Bao mụn xơ dừa đã khử chát (50L)", spec: "Đã ngâm xả EC < 0.5mS/cm", priceVnd: 90_000, buyByDay: 1, urgency: "now" },
    { name: "Phân trùn quế nguyên chất PB01 (10kg)", spec: "Bổ sung vi sinh cố định đạm", priceVnd: 85_000, buyByDay: 1, urgency: "now" },
    { name: "5 Thùng thông minh đáy kép 20L", spec: "Chống úng ngập, có khoang trữ nước", priceVnd: 320_000, buyByDay: 7, urgency: "soon" },
    { name: "Bộ cọc thép bọc nhựa phi 11 + Lưới leo giàn", spec: "Cao 1.8m, mắt lưới 15x15cm", priceVnd: 240_000, buyByDay: 8, urgency: "soon" },
    { name: "Chế phẩm Trichoderma & Dầu Neem ép lạnh", spec: "Phòng bệnh sương mai và bọ trĩ", priceVnd: 115_000, buyByDay: 14, urgency: "later" },
  ],
  risks: [
    {
      icon: "cloud_off",
      title: "Rủi ro thiếu nắng mùa mưa:",
      body: "Nếu tuần 3 có trên 4 ngày liên tục mưa âm u, AI sẽ kích hoạt kịch bản giảm 40% lượng tưới và bật đèn LED bổ sung 3 tiếng mỗi tối.",
      tone: "warning",
    },
    {
      icon: "pest_control",
      title: "Cảnh báo bọ phấn trắng ban công:",
      body: "Khi gặp hiện tượng đốm bạc lá con, bấm nút Báo sự cố ở góc trên để AI tự động điều chỉnh lịch phun neem oil và cách ly chậu nhiễm khuẩn.",
      tone: "danger",
    },
  ],
  devices: [
    { role: "GATEWAY", name: "ESP32 Hub v2 Master", detail: "WiFi + BLE · Ban công T4", icon: "router", protocol: "MQTT", tone: "primary", kind: "gateway" },
    { role: "ĐẤT RỄ", name: "Đầu dò ẩm đất điện dung", detail: "2 điểm đo ngầm rễ", icon: "water_drop", protocol: "ADC", tone: "secondary", kind: "soil_probe" },
    { role: "VI KHÍ HẬU", name: "Cảm biến nhiệt ẩm SHT31", detail: "Đo môi trường tán lá", icon: "thermostat", protocol: "I2C", tone: "primary", kind: "soil_probe" },
    { role: "ĐIỀU KHIỂN", name: "Van Solenoid tưới nhỏ giọt", detail: "Tự đóng mở theo chu kỳ AI", icon: "valve", protocol: "12V DC", tone: "primary", kind: "valve" },
  ],
  iotSuggested: true,
};

const ROBOT: BlueprintTemplate = {
  key: "robot",
  keywords: ["robot", "arduino", "mạch", "xe", "dò đường", "tự hành", "motor", "breadboard", "esp32", "raspberry"],
  name: "Robot Dò Đường Arduino 2 Bánh Tự Hành",
  summary:
    "Robot 2 bánh tự hành dò đường dùng Arduino Uno R3, mảng cảm biến hồng ngoại 5 kênh và driver L298N, chạy ổn định trên vạch 2cm trong nhà.",
  icon: "precision_manufacturing",
  tags: [
    { icon: "precision_manufacturing", label: "Robot 2 bánh tự hành", tone: "primary" },
    { icon: "sensors", label: "Cảm biến hồng ngoại 5 kênh", tone: "secondary" },
    { icon: "build", label: "Điều khiển Arduino Uno R3", tone: "tertiary" },
  ],
  phases: [
    {
      title: "Mua linh kiện & Test từng mạch",
      summary: "Chốt danh sách BOM, nhận linh kiện và kiểm tra vi xử lý, driver và cảm biến rời trước khi lắp.",
      tasks: [
        "Đối chiếu linh kiện với BOM, test nguồn 5V-12V",
        "Nạp bootloader và chạy chương trình blink mẫu",
        "Đọc giá trị 5 mắt cảm biến hồng ngoại trên Serial",
      ],
    },
    {
      title: "Lắp khung & Điều khiển động cơ",
      summary: "Siết khung nhôm, lắp bánh xe, nối driver L298N và viết hàm điều khiển tốc độ theo PWM.",
      tasks: [
        "Siết bulong khung, kiểm tra bánh xe không cọ xát",
        "Nối motor vào driver, đo dòng khi quay tải",
        "Viết hàm moveForward, moveBackward, turnLeft, turnRight",
      ],
    },
    {
      title: "Ghép cảm biến & Hiệu chỉnh dò đường",
      summary: "Đặt mảng 5 mắt cảm biến ở khoảng cách 3cm, hiệu chỉnh ngưỡng trắng/đen và thuật toán PID cơ bản.",
      tasks: [
        "Cố định mảng cảm biến song song với trục bánh xe",
        "Hiệu chỉnh ngưỡng đọc nền trắng và vạch đen trên Serial",
        "Tuning hệ số Kp, Kd để robot không rung vạch",
      ],
    },
    {
      title: "Chạy thử & Tối ưu tốc độ",
      summary: "Chạy thử trên đường 2cm, đo tỉ lệ lạc vạch và tăng tốc theo từng mốc thời gian.",
      tasks: [
        "Chạy 10 vòng liên tục, ghi lại số vòng lạc vạch",
        "Tăng tốc 20% mỗi mốc nếu tỉ lệ lạc vạch dưới 10%",
        "Đóng hộp và dán nhãn mặt trên, mặt dưới",
      ],
    },
  ],
  milestoneCounts: [3, 4, 4, 3],
  dayTitle: "Mua linh kiện & Test từng mạch",
  daySummary: "Đối chiếu linh kiện với BOM và test vi xử lý, driver, cảm biến rời trước khi lắp khung.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Kiểm tra vi xử lý Arduino và nạp chương trình mẫu",
      description: "Cắm Arduino Uno R3 vào máy tính, nạp chương trình blink để xác nhận board, driver USB và nguồn 5V hoạt động.",
      minutes: 20,
      rationale:
        "Test từng mạch rời trước khi lắp giúp phát hiện linh kiện chết sẵn, tránh mất thời gian lắp khung rồi mới biết board không nhận tín hiệu.",
      microSteps: [
        "Mở Arduino IDE, chọn đúng board Arduino Uno và cổng COM.",
        "Nạp ví dụ Blink, xác nhận đèn LED 13 nhấp nháy 1 giây 1 lần.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Đọc giá trị 5 mắt cảm biến hồng ngoại trên Serial",
      description: "Nối mảng cảm biến TCRT5000 vào chân A0-A4, in giá trị analog khi đặt trên nền trắng và trên vạch đen.",
      minutes: 35,
      rationale:
        "Biết trước dải giá trị nền trắng và vạch đen giúp chọn ngưỡng phân biệt ổn định, tránh robot bị lệch vạch khi ánh sáng thay đổi.",
      microSteps: [
        "Đặt cảm biến cách mặt phẳng 3cm, in giá trị raw ra Serial Monitor.",
        "Ghi lại giá trị trung bình trên nền trắng và trên vạch đen.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh mạch đã đấu nối",
      photoHint: "Ảnh chụp rõ dây nối giữa cảm biến, board và nguồn giúp đối chiếu khi lắp khung.",
    },
  ],
  supplies: [
    { name: "Arduino Uno R3 + cáp nạp", spec: "CH340, board đã cắm header", priceVnd: 95_000, buyByDay: 1, urgency: "now" },
    { name: "Driver L298N 2 kênh", spec: "Dòng tối đa 2A/kênh, có tản nhiệt", priceVnd: 45_000, buyByDay: 1, urgency: "now" },
    { name: "Mảng cảm biến hồng ngoại 5 kênh", spec: "TCRT5000, điện trở tạo xung", priceVnd: 65_000, buyByDay: 1, urgency: "now" },
    { name: "Bộ khung nhôm + 2 bánh xe encoder", spec: "Bánh 65mm, motor N20", priceVnd: 240_000, buyByDay: 5, urgency: "soon" },
    { name: "Pin LiPo 2S 2600mAh + sạc", spec: "7.4V, cân bằng 2S", priceVnd: 95_000, buyByDay: 5, urgency: "soon" },
    { name: "Breadboard, dây jump, đầu nối", spec: "830 điểm, dây đực-đực 40 sợi", priceVnd: 60_000, buyByDay: 1, urgency: "now" },
  ],
  risks: [
    {
      icon: "wb_sunny",
      title: "Rủi ro nhiễu cảm biến dưới ánh sáng mạnh:",
      body: "Nếu đo trong phòng có đèn LED trắng công suất lớn, bộ lọc hồng ngoại 16kHz trên board sẽ bị nhiễu, cần bổ sung tấm lọc và tăng khoảng cách đo lên 4cm.",
      tone: "warning",
    },
    {
      icon: "build",
      title: "Cảnh báo motor quay ngược chiều:",
      body: "Khi một bánh quay ngược, báo sự cố kèm mô tả vị trí cổng driver để AI đảo chiều cấp nguồn thay vì bạn phải tháo dây.",
      tone: "danger",
    },
  ],
  devices: [],
  iotSuggested: false,
};

const DIORAMA: BlueprintTemplate = {
  key: "diorama",
  keywords: ["sa bàn", "mô hình", "diorama", "cyberpunk", "miniature", "tỉ lệ", "mô phỏng", "nhà mô hình"],
  name: "Sa Bàn Ngõ Hẻm Cyberpunk 1:35",
  summary:
    "Mô hình ngõ hẻm Neon 30x30cm tỉ lệ 1:35 với mặt đường ướt, biển hiệu cơ điện tử và hiệu ứng mưa âm mờ.",
  icon: "architecture",
  tags: [
    { icon: "architecture", label: "Kích thước 30x30cm", tone: "primary" },
    { icon: "photo_camera", label: "Tỉ lệ 1:35", tone: "secondary" },
    { icon: "wb_sunny", label: "Hiệu ứng LED neon", tone: "tertiary" },
  ],
  phases: [
    {
      title: "Thu thập vật liệu & Dựng khung",
      summary: "Cắt nền gỗ, dán lớp đường nhựa và bố trí mặt bằng ngõ hẻm theo bản vẽ.",
      tasks: [
        "Cắt nền MDF 3mm theo bản vẽ, dán lên nền cứng 40x40cm",
        "Dán lớp đường nhựa tạo mặt đường ướt",
        "Đặt móng và khối nhà theo bố cục ngõ hẻm",
      ],
    },
    {
      title: "Sơn màu & Chi tiết kiến trúc",
      summary: "Sơn nền tông lạnh, thêm cửa sổ, bậc cửa, đường ống và chi tiết hoang tàn.",
      tasks: [
        "Sơn nền acrylic xám xanh, chờ khô hoàn toàn 4 tiếng",
        "Vẽ cửa sổ và bậc cửa bằng acrylic màu",
        "Dán chi tiết gỉ sét và đường ống bằng foam",
      ],
    },
    {
      title: "Đèn LED & Hiệu ứng khí quyển",
      summary: "Đấu dây LED neon mini và hộp nguồn 12V, tạo mưa âm bằng tĩa điện tử và sương mù nhẹ.",
      tasks: [
        "Đấu LED neon mini theo từng cửa hàng, dùng điện trở 220Ω",
        "Lắp hộp nguồn 12V kèm công tắc chânh",
        "Dàn tĩa tạo mưa âm và thêm sương mù pha nước",
      ],
    },
    {
      title: "Bố trí & Chụp ảnh trưng bày",
      summary: "Thêm xe, đèn đường, cây khô và hoàn thiện mặt nền trước khi chụp ảnh showcase.",
      tasks: [
        "Đặt xe mô hình và 2 đèn đường phát sáng",
        "Dán nền sơn xám nhám phía sau để tạo chiều sâu",
        "Chụp ảnh showcase với 2 góc máy chính",
      ],
    },
  ],
  milestoneCounts: [3, 4, 4, 2],
  dayTitle: "Thu thập vật liệu & Dựng khung",
  daySummary: "Cắt nền gỗ, dán lớp đường nhựa và bố trí mặt bằng ngõ hẻm theo bản vẽ.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Cắt nền MDF 3mm theo bản vẽ",
      description: "In bản vẽ mặt bằng tỉ lệ 1:35, dán lên tấm MDF 3mm và cưa theo đường viền ngoài.",
      minutes: 30,
      rationale:
        "Nền phẳng tuyệt đối quyết định độ chính xác khi dán các khối nhà, sai 1mm ở tỉ lệ 1:35 sẽ nhìn thấy rõ ở góc máy cận cảnh.",
      microSteps: [
        "In bản vẽ ở tỉ lệ 1:35 trên giấy A4 dán lên MDF.",
        "Cưa đường ngoài bằng cưa mini, mài lại cạnh bằng nhám 400.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Dán lớp đường nhựa tạo mặt đường ướt",
      description: "Pha sơn acrylic đen nhạt với chất phụ gia mờ, dán lên mặt nền theo bố cục ngõ hẻm.",
      minutes: 25,
      rationale:
        "Lớp đường nền bóng nhẹ phản chiếu ánh đèn neon, tạo cảm giác ẩm ướt đặc trưng của phong cách Cyberpunk.",
      microSteps: [
        "Pha sơn acrylic xám than với 1 giọt chất phụ gia mờ.",
        "Dán bằng miếng xốp, để khô 6 tiếng trước khi sơn chi tiết.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh mặt bằng sau khi dán đường",
      photoHint: "Ảnh chụp từ trên xuống giúp kiểm tra đường không bị nhăn hoặc hở mép.",
    },
  ],
  supplies: [
    { name: "Tấm MDF 3mm 40x40cm", spec: "Nền mô hình, cắt CNC hoặc cưa tay", priceVnd: 45_000, buyByDay: 1, urgency: "now" },
    { name: "Bộ nhựa đường định hình", spec: "Dán mặt đường, dạng keo dán", priceVnd: 55_000, buyByDay: 2, urgency: "now" },
    { name: "Sơn acrylic 12 màu", spec: "Dung môi, khô nhanh, 15ml/màu", priceVnd: 85_000, buyByDay: 2, urgency: "now" },
    { name: "LED neon mini 12V bộ 10", spec: "3 màu, kích thước 3-5mm", priceVnd: 120_000, buyByDay: 8, urgency: "soon" },
    { name: "Nguồn 12V 2A + jack DC", spec: "Cấp nguồn cho LED và đèn đường", priceVnd: 65_000, buyByDay: 8, urgency: "soon" },
    { name: "Đèn LED street mini + dây 0.5mm", spec: "Đèn đường, dây đồng mỏng", priceVnd: 60_000, buyByDay: 12, urgency: "later" },
  ],
  risks: [
    {
      icon: "colorize",
      title: "Rủi ro mất cân bằng khi sơn nhiều lớp:",
      body: "Mỗi lớp sơn dày thêm 0.2mm, hãy sơn mỏng 2-3 lớp mỏng và đặt mô hình úp nghiêng để sơn chảy đều.",
      tone: "warning",
    },
    {
      icon: "warning",
      title: "Cảnh báo nhiệt tỏa từ LED neon:",
      body: "Đèn neon 12V nóng sau 3 tiếng, không dán trực tiếp lên gỗ; dùng tấm nhựa trong 2mm làm mặt chắn nhiệt.",
      tone: "danger",
    },
  ],
  devices: [],
  iotSuggested: false,
};

const AQUARIUM: BlueprintTemplate = {
  key: "aquarium",
  keywords: ["cá", "thủy sinh", "aquarium", "bể cá", "guppy", "iwagumi", "betta", "thuỷ sinh", "cá guppy", "lọc"],
  name: "Bể Thủy Sinh Iwagumi Guppy 30cm",
  summary:
    "Bể cubic 30x30x30cm phong cách Iwagumi không CO2, trồng 3 bụi rong mũi và thả 6 cá Guppy Full Gold sau chu trình nitrogen 30 ngày.",
  icon: "set_meal",
  tags: [
    { icon: "water_drop", label: "Bể 30x30x30cm", tone: "primary" },
    { icon: "eco", label: "Không CO2", tone: "secondary" },
    { icon: "sensors", label: "Theo dõi pH & nhiệt", tone: "tertiary" },
  ],
  phases: [
    {
      title: "Chuẩn bị bể & Nền thủy sinh",
      summary: "Rửa đá, sắp xếp đá theo bố cục Iwagumi và định hình lớp đá nền thấp phía trước.",
      tasks: [
        "Rửa sạch đá vôi bằng nước và bào nhẹ bề mặt",
        "Sắp đá chính theo quy tắc 3-1-2 (đá chính, đá phụ, đá lớn)",
        "Định hình nền thấp ở mặt trước, cao ở mặt sau",
      ],
    },
    {
      title: "Lọc nước & Vi sinh",
      summary: "Lắp bộ lọc thông gió, cắm cây thủy sinh và chạy chu trình nitrogen trước khi thả cá.",
      tasks: [
        "Lắp bộ lọc, bật lưu lượng 8-10 lít/giờ",
        "Cắm 3 bụi rong mũi và 1 bụi rong biển",
        "Thay 50% nước mỗi 3 ngày trong 3 tuần",
      ],
    },
    {
      title: "Thả cây & Thả cá",
      summary: "Đo pH và nhiệt độ ổn định sau 30 ngày, thả cá từng con và quan sát phản ứng.",
      tasks: [
        "Đo pH 6.5-7.5 và nhiệt 25-27°C trước khi thả",
        "Thả 6 cá Guppy Full Gold cách nhau 2 ngày",
        "Không cho ăn 12 giờ đầu để cá tìm quen",
      ],
    },
    {
      title: "Ổn định & Chăm sóc hàng ngày",
      summary: "Duy trì thay nước, cắt tỉa rong và theo dõi các bệnh thường gặp ở cá thủy sinh.",
      tasks: [
        "Thay 30% nước mỗi tuần bằng nước đã lọc",
        "Cắt tỉa rong thừa và lá vàng",
        "Theo dõi thở, bơi và dấu hiệu nấm trắng",
      ],
    },
  ],
  milestoneCounts: [3, 4, 3, 4],
  dayTitle: "Chuẩn bị bể & Nền thủy sinh",
  daySummary: "Rửa đá, sắp xếp đá theo bố cục Iwagumi và định hình lớp đá nền thấp phía trước.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Rửa sạch đá và loại đá vôi",
      description: "Ngâm đá 24 giờ, bào nhẹ bề mặt và loại các viên có vệt trắng vôi canxi khi thả vào nước sủi bọt.",
      minutes: 25,
      rationale:
        "Đá vôi làm tăng pH và độ cứng nước mạnh, khiến rong thủy sinh bị cháy và cá guppy nổi đầu trong nước kiềm.",
      microSteps: [
        "Ngâm đá trong nước máy 24 giờ, thay nước 2 lần.",
        "Bào nhẹ bề mặt, thả một viên vào bát nước để kiểm tra bọt khí.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Bố trí đá theo bố cục Iwagumi",
      description: "Đặt 3 viên đá chính theo bộ ba tam giác lệch, thêm đá phụ và đá nền định hình lớp nền thấp phía trước.",
      minutes: 30,
      rationale:
        "Bố cục Iwagumi giữ 70% diện tích đá trống để tạo khoảng thở cho cá và làm nước chảy đi, tránh vùng nước đục.",
      microSteps: [
        "Đặt đá chính tạo đường chéo, tránh đối xứng hoàn hảo.",
        "Bổ sung đá nền dạng đường cong thấp ở mặt trước.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh bố cục đá trước khi thêm nước",
      photoHint: "Ảnh chụp từ trên xuống giúp kiểm tra khoảng trống giữa các viên đá trước khi thêm cây.",
    },
  ],
  supplies: [
    { name: "Bể thủy tinh cubic 30cm", spec: "Kính 6mm, không đèn", priceVnd: 320_000, buyByDay: 1, urgency: "now" },
    { name: "Bộ lọc thông gió nano", spec: "Lưu lượng 500-800 lít/giờ", priceVnd: 290_000, buyByDay: 1, urgency: "now" },
    { name: "Đá Iwagumi & đá phụ 3kg", spec: "Đá cuội tròn và đá lông gu", priceVnd: 180_000, buyByDay: 2, urgency: "now" },
    { name: "Rong mũi & rong biển", spec: "4 bụi, size 3-5cm", priceVnd: 120_000, buyByDay: 5, urgency: "soon" },
    { name: "Cá Guppy Full Gold", spec: "1 đàn 6 con, cá 2-3 tháng tuổi", priceVnd: 180_000, buyByDay: 28, urgency: "soon" },
    { name: "Bộ test pH + nhiệt độ", spec: "Dải pH 0-14, đo nhiệt 0-50°C", priceVnd: 110_000, buyByDay: 3, urgency: "now" },
  ],
  risks: [
    {
      icon: "science",
      title: "Rủi ro chu trình nitrogen chưa hoàn tất:",
      body: "Thả cá sớm khi nước còn amoniac sẽ gây đều lưng và chết cá trong 3 ngày, luôn đợi test NH3/NH4 bằng 0 trước khi thả.",
      tone: "warning",
    },
    {
      icon: "pest_control",
      title: "Cảnh báo nấm trắng và thở bất thường:",
      body: "Nếu cá thở nhanh, lờ đờ hoặc xuất hiện lông trắng, báo sự cố kèm ảnh để AI điều chỉnh nhiệt độ và đề xuất phác đồ điều trị.",
      tone: "danger",
    },
  ],
  devices: [
    { role: "GATEWAY", name: "ESP32 Hub v2 Master", detail: "WiFi + BLE · Kệ sắp", icon: "router", protocol: "MQTT", tone: "primary", kind: "gateway" },
    { role: "NHIỆT ĐỘ", name: "Cảm biến nhiệt nước DS18B20", detail: "Đo trực tiếp trong bể", icon: "thermostat", protocol: "1-Wire", tone: "primary", kind: "soil_probe" },
    { role: "HOÁ HỌC", name: "Đầu dò pH điện tử", detail: "Theo dõi pH nước theo chu kỳ", icon: "science", protocol: "ADC", tone: "secondary", kind: "soil_probe" },
    { role: "HÌNH ẢNH", name: "Camera mini theo dõi bể", detail: "Xem trực tiếp trên điện thoại", icon: "camera_alt", protocol: "RTSP", tone: "primary", kind: "camera" },
  ],
  iotSuggested: true,
};

const MARATHON: BlueprintTemplate = {
  key: "marathon",
  keywords: ["chạy", "marathon", "tập chạy", "giam", "bán marathon", "half marathon", "thể lực", "running", "21km"],
  name: "Giáo Án Chạy Bán Marathon 21km Trong 12 Tuần",
  summary:
    "Lộ trình 12 tuần 4 buổi mỗi tuần, xây dựng nền tảng chạy 5km liên tục rồi nâng dần cự ly đến 21km an toàn.",
  icon: "directions_run",
  tags: [
    { icon: "directions_run", label: "4 buổi chạy mỗi tuần", tone: "primary" },
    { icon: "pace", label: "Lộ trình 12 tuần", tone: "secondary" },
    { icon: "flag", label: "Mục tiêu 21km", tone: "tertiary" },
  ],
  phases: [
    {
      title: "Nền tảng thể lực",
      summary: "Xây dựng khả năng chạy 5km liên tục mà không bị đau gối hoặc hụt hơi giữa chừng.",
      tasks: [
        "Chạy bộ 3 buổi/tuần ở cường độ thoại",
        "Bổ sung 1 buổi đi bộ nhanh 40 phút",
        "Ghi lại mỗi buổi: quãng đường, nhịp tim trung bình, cảm giác chân",
      ],
    },
    {
      title: "Xây dựng ngưỡng chạy",
      summary: "Tăng cự ly chạy liên tục lên 8-10km, siết kỹ thuật và bắt đầu chạy theo nhịp phân tích.",
      tasks: [
        "Một buổi chạy dài 1 buổi/tuần, tăng 1km mỗi tuần",
        "Thêm 2 buổi interval 400m theo cảm giác",
        "Duy trì nhịp tim trung bình 150-165 lần/phút ở buổi dài",
      ],
    },
    {
      title: "Tăng cường & Chạy dài",
      summary: "Đưa cự ly dài lên 16-18km với nhịp chạy chậm, bổ sung chạy lên dốc để tăng sức bền.",
      tasks: [
        "Chạy dài 16-18km 1 buổi/tuần, 80% trong ngưỡng Zone 2",
        "Thêm 1 buổi chạy động lực 6x800m",
        "Bổ sung 2 buổi tập lực chân và lõi trong tuần",
      ],
    },
    {
      title: "Cạn kê & Giảm tải",
      summary: "Giảm cường độ 2 tuần cuối, giữ nhịp chạy để cơ thể hồi phục trước ngày thi.",
      tasks: [
        "Tuần 11 giảm còn 70% khối lượng chạy",
        "Tuần 12 chỉ chạy nhẹ 5km và 3 buổi chạy ngắn",
        "Chuẩn bị đồ dùng thi và ngủ đủ 7-8 tiếng mỗi đêm",
      ],
    },
  ],
  milestoneCounts: [4, 5, 5, 4],
  dayTitle: "Nền tảng thể lực",
  daySummary: "Xây dựng khả năng chạy 5km liên tục mà không bị đau gối hoặc hụt hơi giữa chừng.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Chạy 5km ở cường độ thoại để lấy nhịp nền",
      description: "Chạy 5km đều, nhịp tim trung bình dưới 80% nhịp tối đa, ghi lại thời gian và cảm giác ở mốc 2km và 5km.",
      minutes: 35,
      rationale:
        "Chạy ở cường độ thoại trong giai đoạn nền tảng xây dựng đủ sức bền cơ mà không tạo chấn thương, là nền cho các tuần tăng tốc sau.",
      microSteps: [
        "Nóng 5 phút đi bộ, chạy 30 phút, hồi 5 phút đi bộ.",
        "Ghi vào nhật ký: quãng đường, nhịp tim, đau gối có hay không.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Kiểm tra khả năng chịu tải ở chân sau buổi chạy dài",
      description: "Sau buổi chạy 5km, kiểm tra độ ẩm và vết sưng ở bàn chân, đồng thời đo nhịp tim hồi phục 1 phút.",
      minutes: 20,
      rationale:
        "Nhịp tim hồi phục 1 phút dưới 120 lần/phút cho thấy khả năng chịu tải tốt, là chỉ số dự báo nguy cơ chấn thương sớm nhất ở giai đoạn này.",
      microSteps: [
        "Đếm nhịp tim ngay sau khi dừng, rồi sau 1 phút nằm nghỉ.",
        "Soi 2 bàn chân, ghi lại vết đỏ hoặc vùng chai mới.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh lòng bàn chân sau buổi chạy",
      photoHint: "Ảnh chụp ngay sau khi về giúp phát hiện sớm vết chai và đầm móng bầm.",
    },
  ],
  supplies: [
    { name: "Giày chạy bộ mới", spec: "Size vừa, đế lưới, dùng được 600km", priceVnd: 1_200_000, buyByDay: 1, urgency: "now" },
    { name: "Đồng hồ thể thao có GPS", spec: "Đo nhịp tim, cự ly, cadence", priceVnd: 1_500_000, buyByDay: 1, urgency: "now" },
    { name: "Bình nước 750ml + giá đeo", spec: "Bình nhựa BPA-free, 750ml", priceVnd: 180_000, buyByDay: 3, urgency: "now" },
    { name: "Gel năng lượng & nước điện giải", spec: "Hộp 24 gel, 10 gói điện giải", priceVnd: 260_000, buyByDay: 10, urgency: "soon" },
    { name: "Quần tắc chạy nữa áo bó", spec: "Co giãn, thoát mồi, 2 chiếc", priceVnd: 320_000, buyByDay: 5, urgency: "soon" },
    { name: "Khăn kéo + băng vải y tế", spec: "Khăn microfiber 80x120cm", priceVnd: 120_000, buyByDay: 5, urgency: "soon" },
  ],
  risks: [
    {
      icon: "warning",
      title: "Rủi ro chấn thương đầu gối khi tăng cự ly:",
      body: "Không tăng quãng đường chạy dài quá 10% mỗi tuần, nếu đau xương ống chân kéo dài hơn 48 giờ thì báo sự cố để AI điều chỉnh lộ trình.",
      tone: "warning",
    },
    {
      icon: "science",
      title: "Cảnh báo thiếu nước và điện giải:",
      body: "Khi nhiệt độ trên 32°C hoặc buổi chạy dài trên 75 phút, AI sẽ nhắc bổ sung 300ml nước điện giải mỗi 25 phút.",
      tone: "danger",
    },
  ],
  devices: [],
  iotSuggested: false,
};

const GENERIC: BlueprintTemplate = {
  key: "generic",
  keywords: [],
  name: "Lộ Trình Triển Khai Theo Mục Tiêu Của Bạn",
  summary:
    "Kế hoạch 4 giai đoạn bám sát mục tiêu đã mô tả: khảo sát, thiết kế, thực thi và bàn giao, mỗi ngày đều có việc cụ thể và điểm kiểm tra.",
  icon: "psychology",
  tags: [
    { icon: "event_upcoming", label: "Lộ trình nhiều giai đoạn", tone: "primary" },
    { icon: "pace", label: "Nhịp làm việc linh hoạt", tone: "secondary" },
    { icon: "verified", label: "Điểm kiểm tra mỗi chặng", tone: "tertiary" },
  ],
  phases: [
    {
      title: "Khảo sát & Chuẩn bị",
      summary: "Xác định rõ tiêu chí hoàn thành, kiểm kê nguồn lực và rủi ro chặng đầu tiên.",
      tasks: [
        "Viết lại mục tiêu thành tiêu chí đo lường được",
        "Kiểm kê công cụ, nguyên liệu và người hỗ trợ",
        "Liệt kê 3 rủi ro lớn nhất và cách xử lý",
      ],
    },
    {
      title: "Thiết kế & Chuẩn bị nội dung",
      summary: "Dựng khung sản phẩm, chuẩn bị nguyên liệu và thử nghiệm trên quy mô nhỏ trước.",
      tasks: [
        "Dựng khung sản phẩm hoặc quy trình đầy đủ",
        "Chuẩn bị nguyên liệu, dụng cụ theo danh sách mua sắm",
        "Chạy thử nhỏ và ghi lại điểm cần sửa",
      ],
    },
    {
      title: "Thực thi & Tinh chỉnh",
      summary: "Làm theo đúng kế hoạch, kiểm tra chất lượng ở từng mốc và sửa sai ngay khi phát hiện.",
      tasks: [
        "Hoàn thành khối lượng chính theo lịch",
        "Kiểm tra tiêu chí ở mỗi mốc và ghi kết quả",
        "Sửa sai và cập nhật kế hoạch cho tuần sau",
      ],
    },
    {
      title: "Hoàn thiện & Bàn giao",
      summary: "Tinh chỉnh lần cuối, đóng gói kết quả và tổng kết để rút ra bài học cho lần sau.",
      tasks: [
        "Rà soát toàn bộ tiêu chí hoàn thành",
        "Đóng gói, ghi nhận chi phí thực tế",
        "Viết tổng kết và bài học để tái sử dụng",
      ],
    },
  ],
  milestoneCounts: [3, 4, 5, 3],
  dayTitle: "Khảo sát & Chuẩn bị",
  daySummary: "Xác định rõ tiêu chí hoàn thành, kiểm kê nguồn lực và rủi ro chặng đầu tiên.",
  goldenStart: null,
  goldenEnd: null,
  steps: [
    {
      title: "Bước 1: Chuyển mục tiêu thành tiêu chí đo lường được",
      description: "Viết lại ý tưởng thành 3-5 tiêu chí có thể quan sát được, kèm thước đo và thời hạn cho từng tiêu chí.",
      minutes: 25,
      rationale:
        "Mục tiêu đo lường được loại bỏ các đánh giá chủ quan, giúp lộ trình có điểm dừng rõ ràng thay vì kéo dài vô tận.",
      microSteps: [
        "Viết mục tiêu dạng một câu, không quá 20 từ.",
        "Gắn thước đo và thời hạn cho từng tiêu chí.",
      ],
      requiresPhoto: false,
      photoTitle: null,
      photoHint: null,
    },
    {
      title: "Bước 2: Kiểm kê nguồn lực và rủi ro chặng đầu",
      description: "Liệt kê công cụ, nguyên liệu, người hỗ trợ và 3 rủi ro lớn nhất kèm phương án xử lý.",
      minutes: 30,
      rationale:
        "Phần lớn dự án trượt tiến độ ở chặng đầu vì thiếu nguyên liệu hoặc chưa nhận ra rủi ro, kiểm kê sớm giúp mua sắm đúng thời điểm.",
      microSteps: [
        "Chia danh sách thành có sẵn và cần mua, ghi giá thành.",
        "Chọn 3 rủi ro lớn nhất và viết cách xử lý cho từng rủi ro.",
      ],
      requiresPhoto: true,
      photoTitle: "Chụp ảnh bảng kiểm kê nguồn lực",
      photoHint: "Ảnh bảng kiểm kê giúp đối chiếu nhanh với danh mục vật tư cần mua sắm.",
    },
  ],
  supplies: [
    { name: "Bộ dụng cụ cơ bản", spec: "Tay, khoan, kéo, bút thử", priceVnd: 150_000, buyByDay: 1, urgency: "now" },
    { name: "Nguyên liệu chính", spec: "Số lượng theo tiêu chí đã chốt", priceVnd: 420_000, buyByDay: 2, urgency: "now" },
    { name: "Thiết bị đo lườu", spec: "Thước, cân, máy đo đặc biệt", priceVnd: 260_000, buyByDay: 3, urgency: "now" },
    { name: "Bộ tài liệu hướng dẫn", spec: "Sách, video, tài liệu tham khảo", priceVnd: 120_000, buyByDay: 2, urgency: "now" },
    { name: "Đồ dùng bảo hộ", spec: "Găng tay, khẩu trang, kính", priceVnd: 110_000, buyByDay: 4, urgency: "soon" },
    { name: "Kho dự phòng sự cố", spec: "10% ngân sách cho thay thế linh kiện", priceVnd: 180_000, buyByDay: 10, urgency: "later" },
  ],
  risks: [
    {
      icon: "warning",
      title: "Rủi ro nguồn lực chưa sẵn sàng:",
      body: "Nếu nguyên liệu về trễ hơn 2 ngày, AI sẽ dời các hạng mục không phụ thuộc sang khung giờ khác để không đứt lộ trình.",
      tone: "warning",
    },
    {
      icon: "flag",
      title: "Cảnh báo tiêu chí hoàn thành bị mơ hồ:",
      body: "Khi tiêu chí chưa rõ ràng, AI sẽ nhắc bổ sung thước đo trước khi chốt mốc để tránh làm xong nhưng không đạt.",
      tone: "danger",
    },
  ],
  devices: [],
  iotSuggested: false,
};

export const BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [GARDEN, ROBOT, DIORAMA, AQUARIUM, MARATHON, GENERIC];

/** The template used when nothing matches; the generic plan never suggests IoT. */
export const FALLBACK_TEMPLATE = GENERIC;
