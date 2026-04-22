/*
Package station chịu trách nhiệm quản lý danh mục và thông tin định danh của các trạm đo.

Trách nhiệm chính (Metadata Management):
- Thực hiện các nghiệp vụ CRUD trạm đo mưa, trạm hồ, trạm sông.
- Quản lý danh mục đơn vị (Organizations).
- Cung cấp phương thức lọc danh sách trạm dựa trên phân quyền.

Khác với package `water`, package này không quan tâm đến dữ liệu đo đạc bên trong mà chỉ quan tâm đến việc trạm đó là trạm nào, nằm ở đâu và thuộc về ai.
*/
package station
