// cleaned up

export async function GET() {
  return new Response(JSON.stringify({ message: 'OK' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
