import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Campo, TipoProjeto } from "./CamposFormulario";

// A rota já é protegida pelo PrivateRoute, então aqui o usuário está sempre autenticado
function EditProjeto() {
  const { id } = useParams(); // Obtém o ID do projeto da URL
  const navigate = useNavigate();

  const [projeto, setProjeto] = useState({
    titulo: "",
    descricaoGeral: "",
    materiais: "",
    passoAPasso: "",
    comoTocar: "",
    comoJogar: "",
    sugestoesAtividades: "",
    habilidadesMusicais: "",
    autor: "",
    referencias: "",
    tipoProjeto: "instrumento",
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Busca os dados do projeto atual para pré-popular o formulário
  useEffect(() => {
    const fetchProjeto = async () => {
      try {
        const { data } = await axios.get(`/projetos/${id}`);
        setProjeto((prev) => ({ ...prev, ...data }));
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
        toast.error("Não foi possível carregar o projeto.");
      } finally {
        setCarregando(false);
      }
    };
    fetchProjeto();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjeto((prevProjeto) => ({ ...prevProjeto, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      // axios envia o token de acesso automaticamente (ver AuthContext)
      await axios.put(`/projetos/${id}`, projeto);
      toast.success("Alterações salvas.");
      navigate(`/projeto/${id}`);
    } catch (error) {
      console.error("Erro ao editar projeto:", error);
      toast.error("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="container form-page" role="status" aria-label="Carregando projeto">
        <header className="form-page__head">
          <span className="skeleton skeleton--line" style={{ width: 100 }} />
          <span className="skeleton skeleton--hero-title" />
        </header>
        <div className="form">
          <div className="form__section skeleton" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Editar projeto</p>
        <h1>{projeto.titulo || "Editar projeto"}</h1>
      </header>

      <form onSubmit={handleSubmit} className="form">
        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>Informações gerais</h2>
          </div>
          <div className="form__fields">
            <Campo id="edit-titulo" name="titulo" rotulo="Título" value={projeto.titulo} onChange={handleChange} required />
            <Campo
              id="edit-descricaoGeral"
              name="descricaoGeral"
              rotulo="Descrição geral"
              value={projeto.descricaoGeral}
              onChange={handleChange}
              multilinha
            />
            <TipoProjeto valor={projeto.tipoProjeto} onChange={handleChange} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Construção</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="edit-materiais"
              name="materiais"
              rotulo="Materiais"
              dica="Separe cada material com ponto e vírgula (;)"
              value={projeto.materiais}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-passoAPasso"
              name="passoAPasso"
              rotulo="Passo a passo"
              dica="Separe cada etapa com ponto e vírgula (;)"
              value={projeto.passoAPasso}
              onChange={handleChange}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">III</span>
            <h2>Instruções de uso</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="edit-comoTocar"
              name="comoTocar"
              rotulo="Como tocar"
              value={projeto.comoTocar}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-comoJogar"
              name="comoJogar"
              rotulo="Como jogar"
              value={projeto.comoJogar}
              onChange={handleChange}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">IV</span>
            <h2>Aplicação didática</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="edit-sugestoesAtividades"
              name="sugestoesAtividades"
              rotulo="Sugestões de atividades"
              value={projeto.sugestoesAtividades}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-habilidadesMusicais"
              name="habilidadesMusicais"
              rotulo="Habilidades musicais"
              value={projeto.habilidadesMusicais}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-referencias"
              name="referencias"
              rotulo="Referências"
              value={projeto.referencias}
              onChange={handleChange}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">V</span>
            <h2>Autoria</h2>
          </div>
          <div className="form__fields">
            <Campo id="edit-autor" name="autor" rotulo="Autor" value={projeto.autor} onChange={handleChange} required />
          </div>
        </section>

        <div className="form__submit">
          <Link to={`/projeto/${id}`} className="btn btn--ghost btn--lg">
            Cancelar
          </Link>
          <button type="submit" className="btn btn--primary btn--lg" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjeto;
