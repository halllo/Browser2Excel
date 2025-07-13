using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddSignalR(o =>
{
	o.MaximumReceiveMessageSize = long.MaxValue;
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("", policy =>
    {
        policy.WithOrigins("https://localhost:3000"/*Excel Addin*/)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("");

app.UseHttpsRedirection();

app.MapGet("/hello", () =>
{
    return Results.Ok(new { text = "Hello World!" });
});

app.MapHub<Browser2ExcelHub>("/hub");

app.Run();



public class Browser2ExcelHub : Hub
{
	private readonly ILogger<Browser2ExcelHub> logger;

	public Browser2ExcelHub(ILogger<Browser2ExcelHub> logger)
	{
		this.logger = logger;
	}

	public override Task OnConnectedAsync()
	{
		logger.LogInformation("Browser2Excel client connected: {ConnectionId}", Context.ConnectionId);
		return base.OnConnectedAsync();
	}

	public override Task OnDisconnectedAsync(Exception? exception)
	{
		if (exception != null)
		{
			logger.LogError(exception, "Browser2Excel client disconnected with error: {ConnectionId}", Context.ConnectionId);
		}
		else
		{
			logger.LogInformation("Browser2Excel client disconnected: {ConnectionId}", Context.ConnectionId);
		}
		return base.OnDisconnectedAsync(exception);
	}

	public async Task RequestElementData(JsonDocument data)
	{
		logger.LogInformation("Requesting element data {data}", data);
		await Clients.All.SendAsync("RequestElementData", data);
	}

	public async Task ResponseElementData(JsonDocument data)
	{
		logger.LogInformation("Received element data {data}", data);
		await Clients.All.SendAsync("ResponseElementData", data);
	}
}