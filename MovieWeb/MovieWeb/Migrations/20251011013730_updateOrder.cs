using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieWeb.Migrations
{
    /// <inheritdoc />
    public partial class updateOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_AspNetUsers_CustomerId",
                schema: "public",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "CustomerPhone",
                schema: "public",
                table: "Orders",
                newName: "UserPhone");

            migrationBuilder.RenameColumn(
                name: "CustomerName",
                schema: "public",
                table: "Orders",
                newName: "UserName");

            migrationBuilder.RenameColumn(
                name: "CustomerId",
                schema: "public",
                table: "Orders",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "CustomerEmail",
                schema: "public",
                table: "Orders",
                newName: "UserEmail");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_CustomerId_Status",
                schema: "public",
                table: "Orders",
                newName: "IX_Orders_UserId_Status");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_AspNetUsers_UserId",
                schema: "public",
                table: "Orders",
                column: "UserId",
                principalSchema: "public",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_AspNetUsers_UserId",
                schema: "public",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "UserPhone",
                schema: "public",
                table: "Orders",
                newName: "CustomerPhone");

            migrationBuilder.RenameColumn(
                name: "UserName",
                schema: "public",
                table: "Orders",
                newName: "CustomerName");

            migrationBuilder.RenameColumn(
                name: "UserId",
                schema: "public",
                table: "Orders",
                newName: "CustomerId");

            migrationBuilder.RenameColumn(
                name: "UserEmail",
                schema: "public",
                table: "Orders",
                newName: "CustomerEmail");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_UserId_Status",
                schema: "public",
                table: "Orders",
                newName: "IX_Orders_CustomerId_Status");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_AspNetUsers_CustomerId",
                schema: "public",
                table: "Orders",
                column: "CustomerId",
                principalSchema: "public",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
