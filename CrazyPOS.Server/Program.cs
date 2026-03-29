using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services;
using CrazyPOS.Server.Services.Pricing;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ----- Security settings -----
var securitySettings = builder.Configuration
    .GetSection("Security")
    .Get<SecuritySettings>() ?? new SecuritySettings();

builder.Services.Configure<SecuritySettings>(builder.Configuration.GetSection("Security"));

// ----- CORS: restrict origins by environment -----
builder.Services.AddCors(options =>
{
    options.AddPolicy("ConfiguredOrigins", policy =>
    {
        if (securitySettings.CorsOrigins.Length > 0)
        {
            policy.WithOrigins(securitySettings.CorsOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            // Production fallback: deny all cross-origin requests if no origins configured
            policy.SetIsOriginAllowed(_ => false);
        }
    });
});

// ----- Database -----
builder.Services.AddDbContextFactory<crazypos_devContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default"),
        optionsBuilder => optionsBuilder.CommandTimeout((int)TimeSpan.FromMinutes(10).TotalSeconds)));

// ----- Authentication: database-backed session tokens -----
builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName, _ => { });

// ----- Authorization policies -----
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",  p => p.RequireRole("Admin"));
    options.AddPolicy("ManagerUp", p => p.RequireRole("Admin", "Manager"));
    options.AddPolicy("AnyStaff",  p => p.RequireRole("Admin", "Manager", "Cashier"));
});

// ----- Application services -----
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddSingleton<IPricingEngine, PricingEngine>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("ConfiguredOrigins");

app.UseHttpsRedirection();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
    c.RoutePrefix = "swagger";
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
