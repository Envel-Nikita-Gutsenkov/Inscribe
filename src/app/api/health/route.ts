import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Perform a quick verification check on the database connection
    db.prepare("SELECT 1").get();
    
    return NextResponse.json({
      status: "healthy",
      timestamp: Date.now()
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({
      status: "unhealthy",
      error: err.message,
      timestamp: Date.now()
    }, { status: 500 });
  }
}
