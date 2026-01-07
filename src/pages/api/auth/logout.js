// Arquivo: src/pages/api/logout.js
export default function handler(req, res) {
  // Verifica se res existe (proteção)
  if (!res) {
    return;
  }

  try {
    // Remove os cookies de autenticação
    res.setHeader('Set-Cookie', [
      'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
      'auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
    ]);

    // Retorna sucesso
    return res.status(200).json({ 
      success: true,
      message: 'Logout realizado com sucesso' 
    });
    
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao fazer logout' 
    });
  }
}

