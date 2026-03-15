using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MovieWeb;
using MovieWeb.Entities;
using MovieWeb.Extensions;
using MovieWeb.Hubs;
using MovieWeb.Hubs;
using MovieWeb.Serialization;
using MovieWeb.Service.Tmdb;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// (Khuyến nghị cho Npgsql nếu gặp vấn đề timestamp)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// 1) EF Core (PostgreSQL)
builder.Services.AddDbContext<MyDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("ConnectedDb")));

// 2) Identity Core (Bearer Token, không cookie)
builder.Services
    .AddIdentityCore<AppUser>(opt =>
    {
        // Password policy nhẹ cho môi trường dev
        opt.Password.RequiredLength = 6;
        opt.Password.RequireDigit = false;
        opt.Password.RequireUppercase = false;
        opt.Password.RequireNonAlphanumeric = false;
        opt.Password.RequireLowercase = false;
        opt.Password.RequiredUniqueChars = 0;
        opt.User.RequireUniqueEmail = true;

        // Nếu sau này xác minh email thì mở dòng dưới:
        // opt.SignIn.RequireConfirmedEmail = true;
    })
    .AddRoles<IdentityRole<long>>()               // Role<int>
    .AddEntityFrameworkStores<MyDbContext>()
    // thêm để đăng kus xác thực otp
    .AddDefaultTokenProviders();



builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    // muốn tự viết api login token... thì cần thêm cái này
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    })
    .AddBearerToken(IdentityConstants.BearerScheme); // Giữ lại cho Identity API

// 4) Authorization
builder.Services.AddAuthorization();

//realtime
builder.Services.AddSignalR();

// 5) CORS (dev) – cho phép call từ client local
//builder.Services.AddCors(opt =>
//{
//    opt.AddPolicy("Dev", p => p
//        .AllowAnyHeader()
//        .AllowAnyMethod()
//        .WithOrigins("http://localhost:3000", "http://localhost:5173", "https://localhost:5173")
//        .AllowCredentials());
//});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev",
        policy => policy
        .WithOrigins(
            "http://localhost:5173",
            "https://test-deploy-m-movie.vercel.app"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .SetIsOriginAllowed(origin => true)
        .AllowCredentials());
});

// 6) Controllers + Swagger
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new EnumMemberJsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Identity API Demo", Version = "v1" });

    // Sửa: dùng HTTP Bearer thay vì ApiKey cho header Authorization
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Scheme = "bearer",
        BearerFormat = "Token",
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Description = "Nhập:Bearer <access_token>"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<TmdbOptions>(builder.Configuration.GetSection("Tmdb"));
builder.Services.AddApplicationServices();

// CORS
//builder.Services.AddCors(opts =>
//{
//    opts.AddPolicy("FrontendDev", p =>
//        p.WithOrigins("http://localhost:5173") // React dev server
//         .AllowAnyHeader()
//         .AllowAnyMethod()
//         .AllowCredentials());
//});

var app = builder.Build();

//seed role

//using (var scope = app.Services.CreateScope())
//{
//    var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<long>>>();
//    var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

//    // 1) Tạo role nếu chưa có
//    foreach (var role in new[] { "Admin", "User" })
//        if (!await roleMgr.RoleExistsAsync(role))
//            await roleMgr.CreateAsync(new IdentityRole<long>(role));

//    // 2) (Tuỳ chọn) Tạo admin mặc định
//    var email = app.Configuration["SeedAdmin:Email"];
//    var pass = app.Configuration["SeedAdmin:Password"];

//    if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(pass))
//    {
//        var admin = await userMgr.FindByEmailAsync(email);
//        if (admin is null)
//        {
//            admin = new AppUser { UserName = email, Email = email, EmailConfirmed = true };
//            var res = await userMgr.CreateAsync(admin, pass);
//            if (res.Succeeded) await userMgr.AddToRoleAsync(admin, "Admin");
//        }
//        else if (!await userMgr.IsInRoleAsync(admin, "Admin"))
//        {
//            await userMgr.AddToRoleAsync(admin, "Admin");
//        }
//    }
//}

// Pipeline
    app.UseSwagger();
    app.UseSwaggerUI();

app.UseHttpsRedirection();

// ⭐ BẬT CORS VỚI TÊN POLICY
app.UseCors("FrontendDev");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.MapHub<ShowtimeHub>("/hubs/showtime");

app.Run();
