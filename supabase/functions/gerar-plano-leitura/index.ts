import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Fetch last 7 days history
    const { data: historico } = await supabase
      .from("historico")
      .select("dados_completos, tipo, criado_em")
      .eq("user_id", userId)
      .gte("criado_em", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("criado_em", { ascending: false });

    // Build pattern summary
    let patternSummary = "Sem histórico recente.";
    if (historico && historico.length > 0) {
      const items = historico.map((h) => {
        const d = h.dados_completos as any;
        if (h.tipo === "versiculo" && d) {
          return `Versículo: ${d.referencia || "?"} - aplicação: ${(d.aplicacao || "").substring(0, 100)}`;
        }
        if (h.tipo === "aconselhamento" && d) {
          return `Aconselhamento: ${(d.reflexao || d.situacao || "").substring(0, 100)}`;
        }
        return `${h.tipo}: registro em ${h.criado_em}`;
      });
      patternSummary = items.join("\n");
    }

    // Get AI config
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: config } = await supabaseAdmin
      .from("configuracoes")
      .select("anthropic_model, max_tokens")
      .eq("id", 1)
      .single();

    const model = config?.anthropic_model || "claude-sonnet-4-20250514";

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API Anthropic não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um conselheiro bíblico que cria planos de leitura profundamente personalizados.
Com base no padrão espiritual e emocional do usuário nos últimos 7 dias, crie um plano de leitura bíblica único. Explore toda a Bíblia — não fique preso em livros populares.
Responda APENAS em JSON válido sem markdown. Chaves obrigatórias:
- titulo (string): nome poético do plano, ex: 'Jornada de Paz e Discernimento'
- descricao (string): 2-3 linhas explicando por que este plano foi criado para este usuário neste momento, em segunda pessoa, caloroso e específico
- total_dias (integer): entre 5 e 14 dias, proporcional à profundidade necessária
- dias (array): cada item com dia_numero (integer), referencia (string, ex: Salmos 23), titulo_passagem (string, título curto), reflexao_ia (string, 2-3 linhas sobre por que esta passagem para este momento específico do usuário)`;

    const userMessage = `Padrão dos últimos 7 dias do usuário:\n${patternSummary}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: userMessage }],
        system: systemPrompt,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar a IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    let parsed: any;
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsed.titulo || !parsed.dias || !Array.isArray(parsed.dias)) {
      return new Response(
        JSON.stringify({ error: "Resposta incompleta da IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark previous active plans as 'substituido'
    await supabase
      .from("planos_leitura")
      .update({ status: "substituido" })
      .eq("user_id", userId)
      .eq("status", "ativo");

    // Insert new plan
    const { data: plano, error: planoError } = await supabase
      .from("planos_leitura")
      .insert({
        user_id: userId,
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        total_dias: parsed.total_dias || parsed.dias.length,
        status: "ativo",
        proximo_plano_em: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select()
      .single();

    if (planoError || !plano) {
      console.error("Error inserting plano:", planoError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar o plano." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert days
    const diasToInsert = parsed.dias.map((d: any) => ({
      plano_id: plano.id,
      user_id: userId,
      dia_numero: d.dia_numero,
      referencia: d.referencia,
      titulo_passagem: d.titulo_passagem,
      reflexao_ia: d.reflexao_ia,
    }));

    const { data: dias, error: diasError } = await supabase
      .from("dias_leitura")
      .insert(diasToInsert)
      .select();

    if (diasError) {
      console.error("Error inserting dias:", diasError);
    }

    return new Response(
      JSON.stringify({ plano, dias: dias || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro interno:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
