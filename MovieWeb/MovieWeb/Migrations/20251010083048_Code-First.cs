using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MovieWeb.Migrations
{
    /// <inheritdoc />
    public partial class CodeFirst : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MovieCategory_Category_CategoryId",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_MovieCategory_Movie_MovieId",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Movie_Country_CountryId",
                schema: "public",
                table: "Movies");

            migrationBuilder.RenameIndex(
                name: "IX_Movie_CountryId",
                schema: "public",
                table: "Movies",
                newName: "IX_Movies_CountryId");

            migrationBuilder.RenameIndex(
                name: "UQ_Country_Name",
                schema: "public",
                table: "Countries",
                newName: "IX_Countries_Name");

            migrationBuilder.RenameIndex(
                name: "UQ_Category_Name",
                schema: "public",
                table: "Categories",
                newName: "IX_Categories_Name");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Movies",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "public",
                table: "Movies",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgeRating",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Movies",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "Duration",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: true,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "public",
                table: "Movies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                schema: "public",
                table: "Movies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PosterUrl",
                schema: "public",
                table: "Movies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReleaseDate",
                schema: "public",
                table: "Movies",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                schema: "public",
                table: "Movies",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                schema: "public",
                table: "Movies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrailerUrl",
                schema: "public",
                table: "Movies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Movies",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Year",
                schema: "public",
                table: "Movies",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                schema: "public",
                table: "MovieCategories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrimary",
                schema: "public",
                table: "MovieCategories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Countries",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                schema: "public",
                table: "Countries",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "public",
                table: "Categories",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "public",
                table: "Categories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                schema: "public",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "AspNetUsers",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                schema: "public",
                table: "AspNetUsers",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Cinemas",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Latitude = table.Column<decimal>(type: "numeric", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cinemas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MovieReviews",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovieId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovieReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MovieReviews_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovieReviews_Movies_MovieId",
                        column: x => x.MovieId,
                        principalSchema: "public",
                        principalTable: "Movies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Promotions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MaxDiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MinOrderAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ValidTo = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    MaxUsage = table.Column<int>(type: "integer", nullable: true),
                    CurrentUsage = table.Column<int>(type: "integer", nullable: false),
                    MaxUsagePerUser = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Promotions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PriceRules",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CinemaId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Tier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: true),
                    TimeFrom = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    TimeTo = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    PriceModifier = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsPercentage = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceRules_Cinemas_CinemaId",
                        column: x => x.CinemaId,
                        principalSchema: "public",
                        principalTable: "Cinemas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rooms",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CinemaId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Rows = table.Column<int>(type: "integer", nullable: false),
                    Cols = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rooms_Cinemas_CinemaId",
                        column: x => x.CinemaId,
                        principalSchema: "public",
                        principalTable: "Cinemas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Seats",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoomId = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Row = table.Column<int>(type: "integer", nullable: false),
                    Col = table.Column<int>(type: "integer", nullable: false),
                    Tier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Seats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Seats_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalSchema: "public",
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Showtimes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovieId = table.Column<long>(type: "bigint", nullable: false),
                    CinemaId = table.Column<int>(type: "integer", nullable: false),
                    RoomId = table.Column<int>(type: "integer", nullable: false),
                    StartAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Format = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Subtitle = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Showtimes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Showtimes_Cinemas_CinemaId",
                        column: x => x.CinemaId,
                        principalSchema: "public",
                        principalTable: "Cinemas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Showtimes_Movies_MovieId",
                        column: x => x.MovieId,
                        principalSchema: "public",
                        principalTable: "Movies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Showtimes_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalSchema: "public",
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ShowtimeId = table.Column<long>(type: "bigint", nullable: false),
                    CustomerId = table.Column<long>(type: "bigint", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FinalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CanceledReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CanceledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    PromotionId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_AspNetUsers_CustomerId",
                        column: x => x.CustomerId,
                        principalSchema: "public",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Orders_Promotions_PromotionId",
                        column: x => x.PromotionId,
                        principalSchema: "public",
                        principalTable: "Promotions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Orders_Showtimes_ShowtimeId",
                        column: x => x.ShowtimeId,
                        principalSchema: "public",
                        principalTable: "Showtimes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<long>(type: "bigint", nullable: false),
                    TransactionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    GatewayTransactionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    GatewayResponse = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    GatewayResponseCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    FailedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RefundedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefundReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefundTransactionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RefundAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "public",
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShowtimeSeats",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ShowtimeId = table.Column<long>(type: "bigint", nullable: false),
                    SeatId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    OrderId = table.Column<long>(type: "bigint", nullable: true),
                    HoldUntil = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShowtimeSeats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShowtimeSeats_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "public",
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ShowtimeSeats_Seats_SeatId",
                        column: x => x.SeatId,
                        principalSchema: "public",
                        principalTable: "Seats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShowtimeSeats_Showtimes_ShowtimeId",
                        column: x => x.ShowtimeId,
                        principalSchema: "public",
                        principalTable: "Showtimes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tickets",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<long>(type: "bigint", nullable: false),
                    SeatId = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TicketCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tickets_Orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "public",
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Tickets_Seats_SeatId",
                        column: x => x.SeatId,
                        principalSchema: "public",
                        principalTable: "Seats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Movies_IsPublished_ReleaseDate",
                schema: "public",
                table: "Movies",
                columns: new[] { "IsPublished", "ReleaseDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Movies_Slug",
                schema: "public",
                table: "Movies",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MovieCategories_MovieId_CategoryId",
                schema: "public",
                table: "MovieCategories",
                columns: new[] { "MovieId", "CategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                schema: "public",
                table: "Categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_MovieId_UserId",
                schema: "public",
                table: "MovieReviews",
                columns: new[] { "MovieId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_MovieReviews_UserId",
                schema: "public",
                table: "MovieReviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId_Status",
                schema: "public",
                table: "Orders",
                columns: new[] { "CustomerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderCode",
                schema: "public",
                table: "Orders",
                column: "OrderCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PromotionId",
                schema: "public",
                table: "Orders",
                column: "PromotionId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ShowtimeId",
                schema: "public",
                table: "Orders",
                column: "ShowtimeId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status_ExpiresAt",
                schema: "public",
                table: "Orders",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrderId",
                schema: "public",
                table: "Payments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Provider_Status",
                schema: "public",
                table: "Payments",
                columns: new[] { "Provider", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Status_CreatedAt",
                schema: "public",
                table: "Payments",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_TransactionId",
                schema: "public",
                table: "Payments",
                column: "TransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PriceRules_CinemaId_IsActive",
                schema: "public",
                table: "PriceRules",
                columns: new[] { "CinemaId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_Code",
                schema: "public",
                table: "Promotions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Promotions_ValidFrom_ValidTo",
                schema: "public",
                table: "Promotions",
                columns: new[] { "ValidFrom", "ValidTo" });

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CinemaId_Name",
                schema: "public",
                table: "Rooms",
                columns: new[] { "CinemaId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Seats_RoomId_Label",
                schema: "public",
                table: "Seats",
                columns: new[] { "RoomId", "Label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Seats_RoomId_Row_Col",
                schema: "public",
                table: "Seats",
                columns: new[] { "RoomId", "Row", "Col" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Showtimes_CinemaId_RoomId_StartAt",
                schema: "public",
                table: "Showtimes",
                columns: new[] { "CinemaId", "RoomId", "StartAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Showtimes_MovieId_StartAt",
                schema: "public",
                table: "Showtimes",
                columns: new[] { "MovieId", "StartAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Showtimes_RoomId",
                schema: "public",
                table: "Showtimes",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_OrderId",
                schema: "public",
                table: "ShowtimeSeats",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_SeatId",
                schema: "public",
                table: "ShowtimeSeats",
                column: "SeatId");

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_ShowtimeId_SeatId",
                schema: "public",
                table: "ShowtimeSeats",
                columns: new[] { "ShowtimeId", "SeatId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShowtimeSeats_Status_HoldUntil",
                schema: "public",
                table: "ShowtimeSeats",
                columns: new[] { "Status", "HoldUntil" });

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_OrderId",
                schema: "public",
                table: "Tickets",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_SeatId",
                schema: "public",
                table: "Tickets",
                column: "SeatId");

            migrationBuilder.AddForeignKey(
                name: "FK_MovieCategories_Categories_CategoryId",
                schema: "public",
                table: "MovieCategories",
                column: "CategoryId",
                principalSchema: "public",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MovieCategories_Movies_MovieId",
                schema: "public",
                table: "MovieCategories",
                column: "MovieId",
                principalSchema: "public",
                principalTable: "Movies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Movies_Countries_CountryId",
                schema: "public",
                table: "Movies",
                column: "CountryId",
                principalSchema: "public",
                principalTable: "Countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MovieCategories_Categories_CategoryId",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_MovieCategories_Movies_MovieId",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Movies_Countries_CountryId",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropTable(
                name: "MovieReviews",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Payments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "PriceRules",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ShowtimeSeats",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Tickets",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Orders",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Seats",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Promotions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Showtimes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Rooms",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Cinemas",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_Movies_IsPublished_ReleaseDate",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropIndex(
                name: "IX_Movies_Slug",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropIndex(
                name: "IX_MovieCategories_MovieId_CategoryId",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Slug",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "AgeRating",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Duration",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "PosterUrl",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "ReleaseDate",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Slug",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TrailerUrl",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Year",
                schema: "public",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropColumn(
                name: "IsPrimary",
                schema: "public",
                table: "MovieCategories");

            migrationBuilder.DropColumn(
                name: "Code",
                schema: "public",
                table: "Countries");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Slug",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "public",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                schema: "public",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "public",
                table: "AspNetUsers");

            migrationBuilder.RenameIndex(
                name: "IX_Movies_CountryId",
                schema: "public",
                table: "Movies",
                newName: "IX_Movie_CountryId");

            migrationBuilder.RenameIndex(
                name: "IX_Countries_Name",
                schema: "public",
                table: "Countries",
                newName: "UQ_Country_Name");

            migrationBuilder.RenameIndex(
                name: "IX_Categories_Name",
                schema: "public",
                table: "Categories",
                newName: "UQ_Category_Name");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Movies",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "public",
                table: "Movies",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Countries",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Categories",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "public",
                table: "Categories",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MovieCategory_Category_CategoryId",
                schema: "public",
                table: "MovieCategories",
                column: "CategoryId",
                principalSchema: "public",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MovieCategory_Movie_MovieId",
                schema: "public",
                table: "MovieCategories",
                column: "MovieId",
                principalSchema: "public",
                principalTable: "Movies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Movie_Country_CountryId",
                schema: "public",
                table: "Movies",
                column: "CountryId",
                principalSchema: "public",
                principalTable: "Countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
