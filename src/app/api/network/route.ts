import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { executeCommand, getPrompt } from '@/lib/network/executor';
import { SwitchState } from '@/lib/network/types';
import { createInitialState } from '@/lib/network/initialState';

// NOTE: This in-memory state is intentional for the demo API endpoint.
// In a serverless environment each cold start resets the state.
// The primary simulation runs client-side; this API is a secondary interface.
let switchState: SwitchState = createInitialState();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, state } = body;

    // Eğer state gönderildiyse, onu kullan
    if (state) {
      switchState = state;
    }

    if (!command) {
      return NextResponse.json({
        error: 'Komut gerekli'
      }, { status: 400 });
    }

    // Komutu çalıştır
    const result = executeCommand(switchState, command);

    // State'i güncelle
    if (result.success && result.newState) {
      switchState = {
        ...switchState,
        ...result.newState
      };
    }

    // Komut geçmişine ekle
    if (command.trim() && !command.trim().startsWith('?')) {
      switchState.commandHistory = [
        ...switchState.commandHistory.slice(-49), // Son 50 komut
        command.trim()
      ];
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      state: switchState,
      prompt: getPrompt(switchState)
    });

  } catch (error) {
    logger.error('Network API Error:', error);
    return NextResponse.json({
      error: 'Sunucu hatası oluştu'
    }, { status: 500 });
  }
}

export async function GET() {
  // Mevcut state'i getir
  return NextResponse.json({
    state: switchState,
    prompt: getPrompt(switchState)
  });
}

// State sıfırlama
export async function DELETE() {
  switchState = createInitialState();
  return NextResponse.json({
    success: true,
    message: 'Switch durumu sıfırlandı',
    state: switchState,
    prompt: getPrompt(switchState)
  });
}
