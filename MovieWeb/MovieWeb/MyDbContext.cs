using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MovieWeb.Entities;

namespace MovieWeb
{
    public class MyDbContext : IdentityDbContext<AppUser, IdentityRole<long>, long>
    {
        public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

        // ==================== DbSets ====================

        // Movie Domain
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<MovieCategory> MovieCategories { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<MovieReview> MovieReviews { get; set; }
        public DbSet<ReviewReport> ReviewReports { get; set; }
        public DbSet<ReviewHelpful> ReviewHelpfuls { get; set; }

        // Cinema Domain
        public DbSet<Cinema> Cinemas { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<PriceRule> PriceRules { get; set; }

        // Showtime & Booking
        public DbSet<Showtime> Showtimes { get; set; }
        public DbSet<ShowtimeSeat> ShowtimeSeats { get; set; }

        // Order & Payment
        public DbSet<Order> Orders { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Promotion> Promotions { get; set; }

        // Gemini Chatbot
        public DbSet<ChatHistory> ChatHistories { get; set; }

        // Support Chat (Realtime Customer Admin)
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ConversationMessage> ConversationMessages { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // PostgreSQL: default schema
            modelBuilder.HasDefaultSchema("public");

            // ==================== MOVIE DOMAIN ====================

            // Movie ↔ Category (Many-to-Many explicit)
            modelBuilder.Entity<MovieCategory>()
                .HasKey(mc => new { mc.MovieId, mc.CategoryId });

            modelBuilder.Entity<MovieCategory>()
                .HasOne(mc => mc.Movie)
                .WithMany(m => m.MovieCategories)
                .HasForeignKey(mc => mc.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieCategory>()
                .HasOne(mc => mc.Category)
                .WithMany(c => c.MovieCategories)
                .HasForeignKey(mc => mc.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Country → Movies (1-to-Many)
            modelBuilder.Entity<Movie>()
                .HasOne(m => m.Country)
                .WithMany(c => c.Movies)
                .HasForeignKey(m => m.CountryId)
                .OnDelete(DeleteBehavior.Restrict);

            // Movie → MovieReviews (1-to-Many)
            modelBuilder.Entity<MovieReview>()
                .HasOne(mr => mr.Movie)
                .WithMany(m => m.Reviews)
                .HasForeignKey(mr => mr.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            // AppUser → MovieReviews (1-to-Many)
            modelBuilder.Entity<MovieReview>()
                .HasOne(mr => mr.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(mr => mr.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Order → MovieReviews (1-to-Many, optional)
            modelBuilder.Entity<MovieReview>()
                .HasOne(mr => mr.Order)
                .WithMany(o => o.MovieReviews)
                .HasForeignKey(mr => mr.OrderId)
                .OnDelete(DeleteBehavior.SetNull);

            // MovieReview → ReviewReports (1-to-Many)
            modelBuilder.Entity<ReviewReport>()
                .HasOne(rr => rr.Review)
                .WithMany(mr => mr.Reports)
                .HasForeignKey(rr => rr.ReviewId)
                .OnDelete(DeleteBehavior.Cascade);

            // AppUser → ReviewReports (1-to-Many)
            modelBuilder.Entity<ReviewReport>()
                .HasOne(rr => rr.ReportedByUser)
                .WithMany(u => u.ReviewReports)
                .HasForeignKey(rr => rr.ReportedByUserId)
                .OnDelete(DeleteBehavior.Cascade);

            // MovieReview → ReviewHelpfuls (1-to-Many)
            modelBuilder.Entity<ReviewHelpful>()
                .HasOne(rh => rh.Review)
                .WithMany(mr => mr.Helpfuls)
                .HasForeignKey(rh => rh.ReviewId)
                .OnDelete(DeleteBehavior.Cascade);

            // AppUser → ReviewHelpfuls (1-to-Many)
            modelBuilder.Entity<ReviewHelpful>()
                .HasOne(rh => rh.User)
                .WithMany(u => u.ReviewHelpfulVotes)
                .HasForeignKey(rh => rh.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for Movie
            modelBuilder.Entity<Movie>()
                .HasIndex(m => m.Slug)
                .IsUnique();
            modelBuilder.Entity<Movie>()
                .HasIndex(m => new { m.IsPublished, m.ReleaseDate });

            // Indexes for Category
            modelBuilder.Entity<Category>()
                .HasIndex(c => c.Slug)
                .IsUnique();
            modelBuilder.Entity<Category>()
                .HasIndex(c => c.Name)
                .IsUnique();

            // Indexes for Country
            modelBuilder.Entity<Country>()
                .HasIndex(c => c.Name)
                .IsUnique();

            // ==================== CINEMA DOMAIN ====================

            // Cinema → Rooms (1-to-Many)
            modelBuilder.Entity<Room>()
                .HasOne(r => r.Cinema)
                .WithMany(c => c.Rooms)
                .HasForeignKey(r => r.CinemaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Room → Seats (1-to-Many)
            modelBuilder.Entity<Seat>()
                .HasOne(s => s.Room)
                .WithMany(r => r.Seats)
                .HasForeignKey(s => s.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            // Cinema → PriceRules (1-to-Many)
            modelBuilder.Entity<PriceRule>()
                .HasOne(pr => pr.Cinema)
                .WithMany(c => c.PriceRules)
                .HasForeignKey(pr => pr.CinemaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for Room
            modelBuilder.Entity<Room>()
                .HasIndex(r => new { r.CinemaId, r.Name })
                .IsUnique();

            // Indexes for Seat
            modelBuilder.Entity<Seat>()
                .HasIndex(s => new { s.RoomId, s.Label })
                .IsUnique();
            modelBuilder.Entity<Seat>()
                .HasIndex(s => new { s.RoomId, s.Row, s.Col })
                .IsUnique();

            // ==================== SHOWTIME & BOOKING ====================

            // Showtime → Movie (Many-to-1)
            modelBuilder.Entity<Showtime>()
                .HasOne(st => st.Movie)
                .WithMany(m => m.Showtimes)
                .HasForeignKey(st => st.MovieId)
                .OnDelete(DeleteBehavior.Restrict);

            // Showtime → Cinema (Many-to-1)
            modelBuilder.Entity<Showtime>()
                .HasOne(st => st.Cinema)
                .WithMany(c => c.Showtimes)
                .HasForeignKey(st => st.CinemaId)
                .OnDelete(DeleteBehavior.Restrict);

            // Showtime → Room (Many-to-1)
            modelBuilder.Entity<Showtime>()
                .HasOne(st => st.Room)
                .WithMany(r => r.Showtimes)
                .HasForeignKey(st => st.RoomId)
                .OnDelete(DeleteBehavior.Restrict);

            // ShowtimeSeat relationships
            modelBuilder.Entity<ShowtimeSeat>()
                .HasOne(sts => sts.Showtime)
                .WithMany(st => st.ShowtimeSeats)
                .HasForeignKey(sts => sts.ShowtimeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ShowtimeSeat>()
                .HasOne(sts => sts.Seat)
                .WithMany(s => s.ShowtimeSeats)
                .HasForeignKey(sts => sts.SeatId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShowtimeSeat>()
                .HasOne(sts => sts.Order)
                .WithMany(o => o.ShowtimeSeats)
                .HasForeignKey(sts => sts.OrderId)
                .OnDelete(DeleteBehavior.SetNull);

            // Indexes for Showtime
            modelBuilder.Entity<Showtime>()
                .HasIndex(st => new { st.MovieId, st.StartAt });
            modelBuilder.Entity<Showtime>()
                .HasIndex(st => new { st.CinemaId, st.RoomId, st.StartAt });

            // Indexes for ShowtimeSeat
            modelBuilder.Entity<ShowtimeSeat>()
                .HasIndex(sts => new { sts.ShowtimeId, sts.SeatId })
                .IsUnique();
            modelBuilder.Entity<ShowtimeSeat>()
                .HasIndex(sts => new { sts.Status, sts.HoldUntil });

            // ==================== ORDER & PAYMENT ====================

            // Order → Showtime (Many-to-1)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Showtime)
                .WithMany(st => st.Orders)
                .HasForeignKey(o => o.ShowtimeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Order → AppUser (Many-to-1, optional)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // Order → Promotion (Many-to-1, optional)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Promotion)
                .WithMany(p => p.Orders)
                .HasForeignKey(o => o.PromotionId)
                .OnDelete(DeleteBehavior.SetNull);

            // Ticket → Order (Many-to-1)
            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Order)
                .WithMany(o => o.Tickets)
                .HasForeignKey(t => t.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ticket → Seat (Many-to-1)
            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Seat)
                .WithMany(s => s.Tickets)
                .HasForeignKey(t => t.SeatId)
                .OnDelete(DeleteBehavior.Restrict);

            // Payment → Order (Many-to-1, REQUIRED)
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithMany(o => o.Payments)
                .HasForeignKey(p => p.OrderId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for Order
            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderCode)
                .IsUnique();
            modelBuilder.Entity<Order>()
                .HasIndex(o => new { o.UserId, o.Status });
            modelBuilder.Entity<Order>()
                .HasIndex(o => new { o.Status, o.ExpiresAt });

            // Indexes for Payment
            modelBuilder.Entity<Payment>()
                .HasIndex(p => p.TransactionId)
                .IsUnique();
            modelBuilder.Entity<Payment>()
                .HasIndex(p => new { p.Status, p.CreatedAt });
            modelBuilder.Entity<Payment>()
                .HasIndex(p => new { p.Provider, p.Status });

            // Indexes for Promotion
            modelBuilder.Entity<Promotion>()
                .HasIndex(p => p.Code)
                .IsUnique();
            modelBuilder.Entity<Promotion>()
                .HasIndex(p => new { p.ValidFrom, p.ValidTo });

            // ==================== PRECISION & CONSTRAINTS ====================

            modelBuilder.Entity<Movie>()
                .Property(m => m.Duration)
                .HasDefaultValue(0);

            modelBuilder.Entity<Showtime>()
                .Property(st => st.BasePrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.TotalAmount)
                .HasPrecision(18, 2);
            modelBuilder.Entity<Order>()
                .Property(o => o.DiscountAmount)
                .HasPrecision(18, 2);
            modelBuilder.Entity<Order>()
                .Property(o => o.FinalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Ticket>()
                .Property(t => t.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);
            modelBuilder.Entity<Payment>()
                .Property(p => p.RefundAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<PriceRule>()
                .Property(pr => pr.PriceModifier)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Promotion>()
                .Property(p => p.Value)
                .HasPrecision(18, 2);
            modelBuilder.Entity<Promotion>()
                .Property(p => p.MaxDiscountAmount)
                .HasPrecision(18, 2);
            modelBuilder.Entity<Promotion>()
                .Property(p => p.MinOrderAmount)
                .HasPrecision(18, 2);

            // ==================== SOFT DELETE QUERY FILTERS ====================
            // Giả định các entity bên dưới đều có IsDeleted (bool). Country/Pricing tuỳ em.

            // Cha (root entities)
            modelBuilder.Entity<Movie>()
                .HasQueryFilter(m => !m.IsDeleted);
            modelBuilder.Entity<Category>()
                .HasQueryFilter(c => !c.IsDeleted);
            modelBuilder.Entity<Cinema>()
                .HasQueryFilter(c => !c.IsDeleted);
            modelBuilder.Entity<Room>()
                .HasQueryFilter(r => !r.IsDeleted);
            modelBuilder.Entity<MovieReview>()
                .HasQueryFilter(mr => !mr.IsDeleted);

            // Many-to-many join must match both ends
            modelBuilder.Entity<MovieCategory>()
                .HasQueryFilter(mc => !mc.Movie.IsDeleted && !mc.Category.IsDeleted);

            // One-to-many dependents must match parent filters
            modelBuilder.Entity<PriceRule>()
                .HasQueryFilter(pr => !pr.Cinema.IsDeleted);

            modelBuilder.Entity<Seat>()
                .HasQueryFilter(s => !s.Room.IsDeleted);

            // Showtime depends on Movie + Cinema + Room
            modelBuilder.Entity<Showtime>()
                .HasQueryFilter(st =>
                    !st.Movie.IsDeleted &&
                    !st.Cinema.IsDeleted &&
                    !st.Room.IsDeleted);

            // ShowtimeSeat depends on Showtime(Movie/Cinema/Room) + Seat(Room)
            modelBuilder.Entity<ShowtimeSeat>()
                .HasQueryFilter(sts =>
                    !sts.Showtime.Movie.IsDeleted &&
                    !sts.Showtime.Cinema.IsDeleted &&
                    !sts.Showtime.Room.IsDeleted &&
                    !sts.Seat.Room.IsDeleted);

            // Order depends on Showtime(Movie/Cinema/Room)
            modelBuilder.Entity<Order>()
                .HasQueryFilter(o =>
                    !o.Showtime.Movie.IsDeleted &&
                    !o.Showtime.Cinema.IsDeleted &&
                    !o.Showtime.Room.IsDeleted);

            // Ticket depends on Order(Showtime...) + Seat(Room)
            modelBuilder.Entity<Ticket>()
                .HasQueryFilter(t =>
                    !t.Order.Showtime.Movie.IsDeleted &&
                    !t.Order.Showtime.Cinema.IsDeleted &&
                    !t.Order.Showtime.Room.IsDeleted &&
                    !t.Seat.Room.IsDeleted);

            // Payment depends on Order(Showtime...)
            modelBuilder.Entity<Payment>()
                .HasQueryFilter(p =>
                    !p.Order.Showtime.Movie.IsDeleted &&
                    !p.Order.Showtime.Cinema.IsDeleted &&
                    !p.Order.Showtime.Room.IsDeleted);

            // review
            modelBuilder.Entity<ReviewHelpful>()
            .HasQueryFilter(h => !h.Review.IsDeleted);

            modelBuilder.Entity<ReviewReport>()
                .HasQueryFilter(rp => !rp.Review.IsDeleted);

            // Gemini Chatbot
            modelBuilder.Entity<ChatHistory>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserId, e.CreatedAt });
            });


            // ==================== SUPPORT CHAT (Realtime) ====================

            // Conversation
            modelBuilder.Entity<Conversation>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Customer)
                      .WithMany()
                      .HasForeignKey(e => e.CustomerId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.AssignedAdmin)
                      .WithMany()
                      .HasForeignKey(e => e.AssignedAdminId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.CustomerId, e.Status });
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.LastMessageAt);
            });

            // ConversationMessage
            modelBuilder.Entity<ConversationMessage>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Conversation)
                      .WithMany(c => c.Messages)
                      .HasForeignKey(e => e.ConversationId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Sender)
                      .WithMany()
                      .HasForeignKey(e => e.SenderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
                entity.HasIndex(e => new { e.ConversationId, e.IsRead });
            });
        }
    }
}
