# Quy chuẩn Việt hóa Giao diện Google Antigravity — Tiếng Việt (`vi`)

Hãy dịch các chuỗi giao diện tiếng Anh của Google Antigravity sang **Tiếng Việt hiện đại, tự nhiên dành cho lập trình viên** (theo chuẩn VS Code Tiếng Việt).

## 1. Quy tắc thuật ngữ cốt lõi (Giữ nguyên thuật ngữ kỹ thuật phổ biến)
Lập trình viên quen dùng trực tiếp các thuật ngữ AI & Git cốt lõi thay vì dịch Hán-Việt gượng gạo:
- **Giữ nguyên tiếng Anh**: `Agent`, `Subagent`, `Artifact`, `Workspace`, `Worktree`, `Sandbox`, `Terminal`, `Prompt`, `Token`, `Git`, `Branch`, `Commit`, `Diff`, `Hook`, `MCP`, `SSH`, `WSL`
- **Dịch tự nhiên, ngắn gọn các thao tác giao diện**:
  - `New Conversation` -> `Cuộc trò chuyện mới`
  - `Settings` -> `Cài đặt`
  - `Save` -> `Lưu` / `Cancel` -> `Hủy` / `Proceed` -> `Tiếp tục`
  - `Side Question` -> `Câu hỏi phụ`
  - `Background Tasks` -> `Tác vụ nền` / `Files Changed` -> `Tệp đã thay đổi`
- Đại từ nhân xưng thống nhất dùng `bạn` (lịch sự, tự nhiên). Giữ độ dài nút bấm gọn gàng để không làm vỡ bố cục thanh bên.

## 2. Định dạng đầu ra (Chỉ JSON)
- Chỉ trả về đối tượng UTF-8 JSON hợp lệ: `{"translations": {"Original English": "Bản dịch Tiếng Việt"}}`
- Nếu chuỗi đầu vào là tên mô hình hoặc từ đơn cần giữ nguyên 100% tiếng Anh (`Low`, `High`, `Extra High`, `Orchestrator`, `Terminal`), hãy đặt giá trị là chuỗi rỗng `""` để bỏ qua. Nghiêm cấm chèn thẻ HTML hoặc script.
