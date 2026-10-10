async function testScheduleApi() {
  console.log("📡 Sending test schedule request for 2026-10-15 with Email & Google Calendar tools...");
  const res = await fetch("http://localhost:5000/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "Sprint Retrospective & Team Sync",
      preferredDate: "2026-10-15",
      durationMinutes: 30,
      timePreference: "afternoon",
      attendees: ["alice@acme.com", "sarah@acme.com"],
      notes: "Sprint review and milestones"
    })
  });

  const data = await res.json();
  console.log("\n📊 API Response Status:", data.finalStatus);
  if (data.confirmedInvite) {
    console.log("\n📅 Confirmed Invite:", JSON.stringify(data.confirmedInvite, null, 2));
    console.log("\n🔗 Google Calendar Direct Add Link:\n", data.confirmedInvite.googleCalendarUrl);
    console.log("\n📧 Email Delivery Details:\n", JSON.stringify(data.confirmedInvite.emailDelivery, null, 2));
  }
}

testScheduleApi().catch(console.error);
