import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { Campo, FichaProjeto } from "./CamposFormulario";
import { urlImagem } from "./imagens";
import { lerProjetosSalvos, quandoFoiSalvo } from "./memoria";
import { mensagemDoErro } from "./comunidade";
import { rotuloTipo } from "./tipos";

const PLANO_VAZIO = {
  titulo: "",
  resumo: "",
  faixasEtarias: [],
  duracao: "",
  objetivos: "",
  materiais: "",
  desenvolvimento: "",
  avaliacao: "",
  dicas: "",
  projetos: [], // ids
  autor: "",
};

const LIMITE_PROJETOS = 10; // deve bater com o servidor (planos.js)

// Rascunho automático: o que foi digitado fica guardado neste aparelho até o plano ser
// publicado. Assim nada se perde se a página recarregar ou o login vencer no meio do texto.
// Um rascunho para o plano novo e um para cada plano em edição.
const chaveRascunho = (id) => `ensine-musica:rascunho-plano:${id || "novo"}`;

function lerRascunho(chave) {
  try {
    const rascunho = JSON.parse(localStorage.getItem(chave));
    return rascunho?.plano ? rascunho : null;
  } catch {
    return null;
  }
}

function gravarRascunho(chave, plano) {
  try {
    const salvoEm = Date.now();
    localStorage.setItem(chave, JSON.stringify({ plano, salvoEm }));
    return salvoEm;
  } catch {
    return null; // sem armazenamento (aba anônima): segue sem rascunho
  }
}

function apagarRascunho(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // nada a apagar
  }
}

// Escolha dos projetos do site usados na aula (busca + lista com caixas de marcar)
function SeletorProjetos({ selecionados, onChange }) {
  const [projetos, setProjetos] = useState(() => lerProjetosSalvos()?.projetos ?? []);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    axios
      .get("/projetos")
      .then(({ data }) => setProjetos(data))
      .catch(() => {});
  }, []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...projetos]
      .sort((a, b) => a.titulo.localeCompare(b.titulo))
      .filter((p) => !termo || p.titulo.toLowerCase().includes(termo));
  }, [projetos, busca]);

  const alternar = (id) => {
    if (selecionados.includes(id)) onChange(selecionados.filter((s) => s !== id));
    else if (selecionados.length >= LIMITE_PROJETOS) toast.error(`Escolha no máximo ${LIMITE_PROJETOS} projetos.`);
    else onChange([...selecionados, id]);
  };

  return (
    <fieldset className="field">
      <legend className="field__label">
        Projetos do site usados na aula
        <span className="field__optional">opcional</span>
      </legend>
      {projetos.length > 6 && (
        <input
          type="search"
          className="input seletor-projetos__busca"
          placeholder="Buscar projeto"
          aria-label="Buscar projeto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      )}
      <ul className="seletor-projetos">
        {visiveis.map((projeto) => (
          <li key={projeto._id}>
            <label className="seletor-projetos__item">
              <input
                type="checkbox"
                checked={selecionados.includes(projeto._id)}
                onChange={() => alternar(projeto._id)}
              />
              <span className="seletor-projetos__capa" aria-hidden="true">
                {projeto.imagem && <img src={urlImagem(projeto.imagem, 120)} alt="" loading="lazy" />}
              </span>
              <span className="seletor-projetos__texto">
                <strong>{projeto.titulo}</strong>
                <span>{rotuloTipo(projeto.tipoProjeto)}</span>
              </span>
            </label>
          </li>
        ))}
        {visiveis.length === 0 && <li className="field__hint">Nenhum projeto encontrado.</li>}
      </ul>
      <p className="field__hint">
        {selecionados.length > 0
          ? `${selecionados.length} ${selecionados.length === 1 ? "projeto escolhido" : "projetos escolhidos"}. Eles aparecem no plano com link para o passo a passo.`
          : "Os projetos escolhidos aparecem no plano com link para o passo a passo."}
      </p>
    </fieldset>
  );
}

function FormPlano() {
  const { id } = useParams(); // com id: editar; sem: novo
  const { usuario, podeEditar } = useAuth();
  const navigate = useNavigate();
  const [plano, setPlano] = useState(null);
  const [original, setOriginal] = useState(null); // o plano sem as mudanças (para comparar e descartar)
  const [rascunhoSalvoEm, setRascunhoSalvoEm] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const publicado = useRef(false);
  const chave = chaveRascunho(id);

  const descartarRascunho = useCallback(
    (base) => {
      apagarRascunho(chave);
      setPlano(base);
      setRascunhoSalvoEm(null);
    },
    [chave]
  );

  // Começa do plano (novo ou salvo) e, se houver rascunho, continua de onde parou
  const comecar = useCallback(
    (base) => {
      setOriginal(base);
      const rascunho = lerRascunho(chave);
      if (!rascunho) {
        setPlano(base);
        return;
      }
      setPlano({ ...base, ...rascunho.plano });
      setRascunhoSalvoEm(rascunho.salvoEm);
      toast("Rascunho recuperado", {
        description: `Você continua de onde parou (salvo ${quandoFoiSalvo(rascunho.salvoEm)}).`,
        action: { label: "Descartar", onClick: () => descartarRascunho(base) },
      });
    },
    [chave, descartarRascunho]
  );

  // Salva o rascunho um instante depois que a pessoa para de digitar
  useEffect(() => {
    if (!plano || !original || publicado.current) return undefined;
    const temporizador = setTimeout(() => {
      if (publicado.current) return;
      if (JSON.stringify(plano) === JSON.stringify(original)) {
        apagarRascunho(chave);
        setRascunhoSalvoEm(null);
      } else {
        setRascunhoSalvoEm(gravarRascunho(chave, plano));
      }
    }, 600);
    return () => clearTimeout(temporizador);
  }, [plano, original, chave]);

  useEffect(() => {
    if (id) return;
    comecar({ ...PLANO_VAZIO, autor: usuario?.principal ? "" : usuario?.nome || "" });
    // Só ao abrir o formulário (o nome da conta não muda enquanto ele está aberto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`/planos/${id}`)
      .then(({ data }) => {
        if (!podeEditar(data)) {
          toast.error("Você só pode editar os planos que você publicou.");
          navigate(`/plano/${id}`, { replace: true });
          return;
        }
        comecar({
          ...PLANO_VAZIO,
          ...Object.fromEntries(Object.keys(PLANO_VAZIO).map((campo) => [campo, data[campo] ?? PLANO_VAZIO[campo]])),
          duracao: data.duracao || "",
          projetos: (data.projetos || []).filter(Boolean).map((p) => p._id),
        });
      })
      .catch(() => {
        toast.error("Não foi possível carregar o plano de aula.");
        navigate("/planos");
      });
  }, [id, podeEditar, navigate, comecar]);

  if (!plano) {
    return (
      <div className="container form-page" role="status" aria-label="Carregando plano de aula">
        <span className="skeleton skeleton--hero-title" />
      </div>
    );
  }

  const atualizar = (e) => setPlano((atual) => ({ ...atual, [e.target.name]: e.target.value }));
  const atualizarCampo = (campo, valor) => setPlano((atual) => ({ ...atual, [campo]: valor }));

  const salvar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const { data } = id ? await axios.put(`/planos/${id}`, plano) : await axios.post("/planos", plano);
      publicado.current = true;
      apagarRascunho(chave);
      toast.success(id ? "Plano de aula atualizado." : "Plano de aula publicado!");
      navigate(`/plano/${data._id}`);
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível salvar o plano de aula. Tente novamente."));
      setEnviando(false);
    }
  };

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">{id ? "Editar" : "Novo"} plano de aula</p>
        <h1>{id ? plano.titulo || "Plano de aula" : "Escrever um plano de aula"}</h1>
        <p>Uma sequência pronta para outro professor aplicar: o que a turma aprende, o que levar e como conduzir a aula.</p>
      </header>

      <form onSubmit={salvar} className="form">
        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>A aula</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="titulo"
              name="titulo"
              rotulo="Título"
              placeholder="Ex.: Pulsação e ritmo com chocalhos"
              value={plano.titulo}
              onChange={atualizar}
              maxLength={140}
              required
            />
            <Campo
              id="resumo"
              name="resumo"
              rotulo="Resumo"
              dica="Duas ou três frases: o tema da aula e o que a turma vai fazer"
              value={plano.resumo}
              onChange={atualizar}
              multilinha
              required
            />
            <FichaProjeto
              valor={plano}
              onChange={atualizarCampo}
              semNivel
              dicaFaixas="Marque as turmas para as quais o plano foi pensado"
            />
            <Campo
              id="objetivos"
              name="objetivos"
              rotulo="Objetivos"
              dica="Um objetivo por linha"
              placeholder={"Perceber a pulsação de uma música\nManter o pulso em grupo com o chocalho"}
              value={plano.objetivos}
              onChange={atualizar}
              multilinha
              required
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Materiais</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="materiais"
              name="materiais"
              rotulo="Materiais"
              dica="Um item por linha"
              placeholder={"Chocalhos de garrafa PET (um por aluno)\nCaixa de som"}
              value={plano.materiais}
              onChange={atualizar}
              multilinha
            />
            <SeletorProjetos selecionados={plano.projetos} onChange={(projetos) => atualizarCampo("projetos", projetos)} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">III</span>
            <h2>Desenvolvimento</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="desenvolvimento"
              name="desenvolvimento"
              rotulo="Etapas da aula"
              dica='Uma etapa por linha. Comece pelo tempo, ex.: "Acolhida (10 min): roda de conversa sobre…"'
              value={plano.desenvolvimento}
              onChange={atualizar}
              multilinha
              rows={8}
              required
            />
            <Campo
              id="avaliacao"
              name="avaliacao"
              rotulo="Avaliação"
              dica="Como perceber se a turma aprendeu"
              value={plano.avaliacao}
              onChange={atualizar}
              multilinha
            />
            <Campo
              id="dicas"
              name="dicas"
              rotulo="Dicas"
              dica="Adaptações, cuidados e o que funcionou na prática"
              value={plano.dicas}
              onChange={atualizar}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">IV</span>
            <h2>Autoria</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="autor"
              name="autor"
              rotulo="Quem escreveu"
              placeholder="Como devemos assinar este plano?"
              value={plano.autor}
              onChange={atualizar}
              autoComplete="name"
              required
            />
          </div>
        </section>

        <div className="form__submit">
          {rascunhoSalvoEm && (
            <p className="rascunho-status" aria-live="polite">
              Rascunho salvo neste aparelho {quandoFoiSalvo(rascunhoSalvoEm)}
              <button type="button" className="rascunho-status__descartar" onClick={() => descartarRascunho(original)}>
                Descartar
              </button>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--lg" disabled={enviando}>
            {enviando ? "Salvando…" : id ? "Salvar alterações" : "Publicar plano de aula"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormPlano;
