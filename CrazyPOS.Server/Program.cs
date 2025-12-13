using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Receipt Service
builder.Services.AddScoped<IReceiptService, ReceiptService>();

builder.Services.AddDbContextFactory<crazypos_devContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default"),
    optionsBuilder =>
    {
        optionsBuilder.CommandTimeout((int)TimeSpan.FromMinutes(10).TotalSeconds);
        //optionsBuilder.UseCompatibilityLevel(110);
    }
    )
    );

//builder.WebHost.ConfigureKestrel(serverOptions =>
//{
//    serverOptions.Limits.MaxRequestHeadersTotalSize = 80000; // 32KB, increase as needed
//});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowAll");

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
    c.RoutePrefix = "swagger"; // Set Swagger UI at the /swagger endpoint
});

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
