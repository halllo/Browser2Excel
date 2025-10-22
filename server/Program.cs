using AgentDo;
using AgentDo.Content;
using AgentDo.OpenAI;
using Microsoft.AspNetCore.SignalR;
using OpenAI.Chat;
using System.ComponentModel;
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

builder.Services.AddSingleton(sp => new ChatClient(
	model: "gpt-4o",
	apiKey: builder.Configuration["OPENAI_API_KEY"]!));

builder.Services.AddSingleton<IAgent, OpenAIAgent>();
builder.Services.Configure<OpenAIAgentOptions>(o =>
{
	o.Temperature = 0.0f;
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

app.MapPost("/extract", async (HttpRequest request, IAgent agent) =>
{
	if (!request.HasFormContentType || request.Form.Files.Count == 0)
	{
		return Results.BadRequest(new { error = "No file uploaded." });
	}

	using var memoryStream = new MemoryStream();
	var file = request.Form.Files[0];
	await file.CopyToAsync(memoryStream);

	using var document = Document.From(memoryStream, file.FileName);
	CreditCardStatement? creditCardStatement = default;
	var messages = await agent.Do(//todo use agent.Get<>()
		task: new Prompt("Here is my credit card statement.", document),
		tools:
		[
			Tool.From(toolName: "CreditCardStatement", tool: [Description("Understand the credit card statement.")]
			(CreditCardStatement c, Tool.Context context) =>
			{
				context.Cancelled = true;
				creditCardStatement = c;
			}),
		]);

	return Results.Ok(creditCardStatement);
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
		logger.LogInformation("Requesting element data {data}", Truncated(JsonSerializer.Serialize(data)));
		await Clients.All.SendAsync("RequestElementData", data);
	}

	public async Task ResponseElementData(JsonDocument data)
	{
		logger.LogInformation("Received element data {data}", Truncated(JsonSerializer.Serialize(data)));
		await Clients.All.SendAsync("ResponseElementData", data);
	}

	public async Task Highlight(JsonDocument data)
	{
		logger.LogInformation("Highlight {data}", Truncated(JsonSerializer.Serialize(data)));
		await Clients.All.SendAsync("Highlight", data);
	}

	static string Truncated(string value, int maxLength = 500) => value.Length <= maxLength ? value : value[..maxLength] + "...";
}

record CreditCardStatement(DateTime Start, DateTime End, string Number, Booking[] Bookings, [property: Description("Pay attention if its positive or negative.")] Amount NewSaldo);
record Booking(DateTime BelegDatum, DateTime BuchungsDatum, string Zweck, Amount BetragInEuro, string? Waehrung = null, Amount? Betrag = null, string? Kurs = null, Amount? WaehrungsumrechnungInEuro = null);
