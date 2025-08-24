using CommandLine;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;

namespace cli.Verbs
{
	[Verb("get-all")]
	class GetAll
	{
		public async Task Do(ILogger<GetAll> logger)
		{
			var connection = new HubConnectionBuilder()
				.WithUrl("https://localhost:7026/hub")
				.Build();

			connection.Closed += async (error) =>
			{
				await Task.Delay(new Random().Next(0, 5) * 1000);
				await connection.StartAsync();
			};

			var tcs = new TaskCompletionSource<JsonElement>();
			connection.On<JsonElement>("ResponseElementData", tcs.SetResult);

			await connection.StartAsync();

			await connection.InvokeAsync<JsonElement>("RequestElementData", new { data = "1337" });

			var cts = new CancellationTokenSource();
			cts.CancelAfter(TimeSpan.FromSeconds(3));
			cts.Token.Register(() => { tcs.TrySetCanceled(cts.Token); });

			Console.WriteLine("Waiting for response...");
			var data = await tcs.Task;

			var elements = data.Deserialize<Response>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
			elements?.Display();

			Console.WriteLine("Closing connection...");
			await connection.StopAsync();

		}
	}

	public class Response
	{
		public string Url { get; set; } = null!;
		public Element[] Elements { get; set; } = null!;

		public void Display()
		{
			foreach (var element in Elements.Reverse().Where(t => t.ParsedDate != null))
			{
				var date = element.ParsedDate?.ToString("dd/MM/yyyy");
				Console.WriteLine($"{element.Id};{date};{element.Arialabel}");
			}
		}
	}

	public class Element
	{
		public int Id { get; set; }
		public string Content { get; set; } = null!;
		public string? Date { get; set; }
		public string? Arialabel { get; set; }

		const string format = "yyyy-MM-dd-HH.mm.ss.ffffff";
		public DateTime? ParsedDate => DateTime.TryParseExact(Date, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result) ? result : default(DateTime?);
	}
}
