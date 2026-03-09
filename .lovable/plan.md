

# Corrigir login travando eternamente na página de autenticação

## Problema

Há uma **condição de corrida** (race condition) na página `Auth.tsx`. Quando o usuário faz login:

1. `handleSubmit` chama `signInWithPassword` e começa a verificar o perfil
2. **Simultaneamente**, o `onAuthStateChange` dispara com a nova sessão e **também** verifica o perfil
3. Se o usuário não é `super_admin`, o `onAuthStateChange` chama `signOut()` antes de `handleSubmit` terminar
4. O `signOut()` invalida a sessão, causando falhas nas queries de perfil do `handleSubmit`
5. O `signOut()` dispara outro `onAuthStateChange`, criando um ciclo confuso
6. O botão fica em estado de loading indefinidamente

## Solução

Remover a verificação de perfil do `onAuthStateChange`, pois `handleSubmit` já faz isso. O `onAuthStateChange` deve apenas redirecionar sessões existentes (quando o usuário abre a página já logado como super_admin), sem interferir no fluxo de login.

Adicionar uma flag `isSubmitting` para que o `onAuthStateChange` ignore eventos durante o login ativo.

## Arquivo modificado

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Auth.tsx` | Adicionar ref `isSubmitting` para bloquear `onAuthStateChange` durante o login; simplificar o listener para não chamar `signOut` |

## Detalhes técnicos

```text
Fluxo corrigido:

1. onAuthStateChange: 
   - Se isSubmitting = true → ignora
   - Se sessão existe → verifica perfil → se super_admin, navega
   - Se não super_admin → não faz nada (não chama signOut)

2. handleSubmit:
   - Seta isSubmitting = true
   - signInWithPassword → verifica perfil
   - Se não super_admin → signOut + toast de erro  
   - Se super_admin → navega para /modules
   - Seta isSubmitting = false no finally
```

