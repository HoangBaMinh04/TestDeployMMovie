using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MovieWeb.Migrations
{
    /// <inheritdoc />
    public partial class AddMovieReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.AddColumn<decimal>(
                name: "AverageRating",
                schema: "public",
                table: "Movies",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "TotalRating1Star",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalRating2Star",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalRating3Star",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalRating4Star",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalRating5Star",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalReviews",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Content",
                schema: "public",
                table: "MovieReviews",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "HelpfulCount",
                schema: "public",
                table: "MovieReviews",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerifiedPurchase",
                schema: "public",
                table: "MovieReviews",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVisible",
                schema: "public",
                table: "MovieReviews",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "NotHelpfulCount",
                schema: "public",
                table: "MovieReviews",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "OrderId",
                schema: "public",
                table: "MovieReviews",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                schema: "public",
                table: "MovieReviews",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReviewHelpfuls",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReviewId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    IsHelpful = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewHelpfuls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewHelpfuls_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewHelpfuls_MovieReviews_ReviewId",
                        column: x => x.ReviewId,
                        principalSchema: "public",
                        principalTable: "MovieReviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReviewReports",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReviewId = table.Column<long>(type: "bigint", nullable: false),
                    ReportedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsResolved = table.Column<bool>(type: "boolean", nullable: false),
                    AdminNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewReports_AspNetUsers_ReportedByUserId",
                        column: x => x.ReportedByUserId,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewReports_MovieReviews_ReviewId",
                        column: x => x.ReviewId,
                        principalSchema: "public",
                        principalTable: "MovieReviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                schema: "public",
                table: "MovieReviews",
                columns: new[] { "MovieId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_OrderId",
                schema: "public",
                table: "MovieReviews",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewHelpfuls_ReviewId_UserId",
                schema: "public",
                table: "ReviewHelpfuls",
                columns: new[] { "ReviewId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReviewHelpfuls_UserId",
                schema: "public",
                table: "ReviewHelpfuls",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ReportedByUserId",
                schema: "public",
                table: "ReviewReports",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ReviewId_ReportedByUserId",
                schema: "public",
                table: "ReviewReports",
                columns: new[] { "ReviewId", "ReportedByUserId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MovieReviews_Orders_OrderId",
                schema: "public",
                table: "MovieReviews",
                column: "OrderId",
                principalSchema: "public",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MovieReviews_Orders_OrderId",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropTable(
                name: "ReviewHelpfuls",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ReviewReports",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropIndex(
                name: "IX_MovieReviews_OrderId",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "AverageRating",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalRating1Star",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalRating2Star",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalRating3Star",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalRating4Star",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalRating5Star",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TotalReviews",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Content",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "HelpfulCount",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "IsVerifiedPurchase",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "IsVisible",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "NotHelpfulCount",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "OrderId",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.DropColumn(
                name: "Title",
                schema: "public",
                table: "MovieReviews");

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                schema: "public",
                table: "MovieReviews",
                columns: new[] { "MovieId", "UserId" });
        }
    }
}
