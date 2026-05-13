import { shell } from 'electron'
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import axios from 'axios'

export interface GoogleUser {
  email: string
  name: string
  picture: string
  sub: string
}

export interface AuthState {
  user: GoogleUser | null
  accessToken: string | null
  expiresAt: number | null
}

export class GoogleAuth {
  private state: AuthState = { user: null, accessToken: null, expiresAt: null }

  async signIn(): Promise<GoogleUser> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID não configurado. Adicione ao arquivo .env')
    }
    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET não configurado. Adicione ao arquivo .env')
    }

    const csrfState = randomBytes(16).toString('hex')
    const redirectUri = 'http://localhost:9999/callback'

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: csrfState,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    await shell.openExternal(authUrl)

    return new Promise<GoogleUser>((resolve, reject) => {
      let settled = false

      const server = http.createServer(async (req, res) => {
        if (!req.url?.startsWith('/callback')) {
          res.writeHead(404)
          res.end()
          return
        }

        const url = new URL(req.url, 'http://localhost:9999')
        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')
        const errorParam = url.searchParams.get('error')

        const htmlClose = (title: string, body: string) =>
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
          `<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;` +
          `height:100vh;margin:0;background:#0B0B0E;color:#ECEDEE;}</style></head>` +
          `<body><p>${body}</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`

        if (errorParam) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(htmlClose('Erro', `Autenticação cancelada: ${errorParam}`))
          done()
          reject(new Error(`OAuth2 error: ${errorParam}`))
          return
        }

        if (returnedState !== csrfState) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(htmlClose('Erro', 'State CSRF inválido.'))
          done()
          reject(new Error('CSRF state mismatch'))
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(htmlClose('Erro', 'Código de autorização ausente.'))
          done()
          reject(new Error('Missing authorization code'))
          return
        }

        try {
          // Troca code por token
          const tokenRes = await axios.post<{
            access_token: string
            expires_in: number
            token_type: string
          }>(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
          )

          const { access_token, expires_in } = tokenRes.data

          // Busca informações do usuário
          const userinfoRes = await axios.get<GoogleUser>(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${access_token}` } },
          )

          const user = userinfoRes.data

          this.state = {
            user,
            accessToken: access_token,
            expiresAt: Date.now() + expires_in * 1000,
          }

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(htmlClose('Autenticado', `Bem-vindo, ${user.name}! Pode fechar esta aba.`))

          done()
          resolve(user)
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(htmlClose('Erro', 'Falha ao trocar o código pelo token.'))
          done()
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })

      const done = () => {
        if (settled) return
        settled = true
        server.close()
      }

      server.on('error', (err) => {
        done()
        reject(err)
      })

      server.listen(9999, '127.0.0.1', () => {
        // Server listening — aguardando redirect do Google
      })

      // Timeout de 5 minutos
      setTimeout(() => {
        if (!settled) {
          done()
          reject(new Error('Timeout: autenticação não concluída em 5 minutos'))
        }
      }, 5 * 60 * 1000)
    })
  }

  signOut(): void {
    this.state = { user: null, accessToken: null, expiresAt: null }
  }

  getState(): AuthState {
    return { ...this.state }
  }

  isAuthenticated(): boolean {
    return (
      this.state.accessToken !== null &&
      this.state.expiresAt !== null &&
      Date.now() < this.state.expiresAt
    )
  }
}

export const googleAuth = new GoogleAuth()
