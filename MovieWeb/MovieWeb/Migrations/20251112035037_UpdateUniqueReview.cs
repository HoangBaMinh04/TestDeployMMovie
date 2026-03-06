using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieWeb.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUniqueReview : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Bỏ index cũ không có filter
            migrationBuilder.DropIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                table: "MovieReviews");

            // 2) Tạo partial unique index với filter IsDeleted = FALSE
            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                table: "MovieReviews",
                columns: new[] { "MovieId", "UserId" },
                unique: true,
                filter: "\"IsDeleted\" = FALSE");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Quay lại trạng thái ban đầu (không filter)
            migrationBuilder.DropIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                table: "MovieReviews");

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                table: "MovieReviews",
                columns: new[] { "MovieId", "UserId" },
                unique: true);
        }
    }
}
