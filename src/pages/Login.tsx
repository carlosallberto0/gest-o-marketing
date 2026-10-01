import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "senha" | "link" | "esqueci";

const MODE_TEXT: Record<Mode, { title: string; description: string; action: string; busy: string }> = {
  senha: {
    title: "Bem-vindo de volta!",
    description: "Entre com seu e-mail e senha para continuar",
    action: "Entrar",
    busy: "Entrando…",
  },
  link: {
    title: "Entrar com link",
    description: "Enviaremos um link de acesso para o seu e-mail",
    action: "Enviar link",
    busy: "Enviando…",
  },
  esqueci: {
    title: "Esqueci minha senha",
    description: "Enviaremos um link para você criar uma nova senha",
    action: "Enviar link",
    busy: "Enviando…",
  },
};

export default function Login() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("senha");
  const [sent, setSent] = useState(false);
  const text = MODE_TEXT[mode];

  if (!authLoading && session) {
    return <Navigate to="/" replace />;
  }

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSent(false);

    if (mode !== "senha") {
      if (!email.trim()) {
        setError("Informe seu e-mail.");
        return;
      }
      setSubmitting(true);
      const { error: mailError } =
        mode === "link"
          ? await supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/` },
            })
          : await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/redefinir-senha`,
            });
      setSubmitting(false);
      // Só rate limit é revelado; qualquer outro resultado vira mensagem
      // genérica para não expor se o e-mail existe.
      if (mailError?.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      } else {
        setSent(true);
      }
      return;
    }

    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setSubmitting(false);
    }
    // Sem sucesso: onAuthStateChange atualiza a sessão e o redirect acima
    // desmonta esta página — não há necessidade de zerar submitting.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div
            aria-hidden="true"
            className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground"
          >
            M
          </div>
          <CardDescription>Marketing OS</CardDescription>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {mode === "senha" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            )}
            {sent && (
              <p role="status" className="text-sm text-muted-foreground">
                Se o e-mail estiver cadastrado, enviamos um link. Confira sua caixa de entrada.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? text.busy : text.action}
            </Button>
            {mode === "senha" ? (
              <>
                <Button type="button" variant="link" onClick={() => changeMode("link")}>
                  Entrar com link por e-mail
                </Button>
                <Button type="button" variant="link" onClick={() => changeMode("esqueci")}>
                  Esqueci minha senha
                </Button>
              </>
            ) : (
              <Button type="button" variant="link" onClick={() => changeMode("senha")}>
                Voltar para o login com senha
              </Button>
            )}
          </form>
        </CardContent>
        <CardFooter className="justify-center text-center text-sm text-muted-foreground">
          Não tem uma conta? Fale com o administrador.
        </CardFooter>
      </Card>
    </div>
  );
}
