**POLÍTICA DE SEGURANÇA DA INFORMAÇÃO**

Sistema Acadêmico

| Campo | Informação |
| :---- | :---- |
| Versão | 1.4 |
| Data | 24/10/2026 |
| Elaborado por | Equipe de Política de Segurança |
| Destinatários | Equipe de Desenvolvimento e Equipe de Auditoria |
| Classificação | Uso interno |

# **1\. Objetivo**

Esta Política estabelece os requisitos de segurança da informação que o Sistema Acadêmico deverá atender desde a sua concepção, com a finalidade de proteger a confidencialidade, a integridade e a disponibilidade dos dados de alunos, professores e da instituição, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD).

# **2\. Escopo**

Esta Política aplica-se ao Sistema Acadêmico de instituição privada de ensino superior, abrangendo todos os seus módulos (cadastros, cursos, períodos, disciplinas, matrículas, notas, registros de auditoria e cópias de segurança), aos servidores, bancos de dados e ambientes de desenvolvimento, homologação e produção, bem como a todos os usuários, colaboradores e prestadores de serviço que acessem o sistema.

# **3\. Referências normativas**

A tabela indica, para cada referência, se ela é de cumprimento **obrigatório** (lei ou regulamento) ou adotada como **boa prática**, e em que condição se aplica a este sistema.

| Referência | Natureza | Aplicação e aplicabilidade |
| :---- | :---- | :---- |
| Lei nº 13.709/2018 (LGPD) | Obrigatória | Aplica-se integralmente: a instituição trata dados pessoais de alunos e professores. Artigos usados: 5º, 6º, 7º, 9º, 11, 14, 16, 18, 33, 37, 41, 42, 46, 48 e 52\. |
| Resolução CD/ANPD nº 15/2024 | Obrigatória | Aplica-se ao controlador em incidentes com risco ou dano relevante: comunicação em 3 dias úteis e guarda do registro do incidente por 5 anos. |
| Lei nº 12.965/2014 (Marco Civil da Internet), art. 15 | Obrigatória | Aplica-se porque a instituição é privada: provedores de aplicação constituídos como pessoa jurídica com fins econômicos devem guardar os registros de acesso por, no mínimo, 6 meses. |
| Decreto nº 9.235/2017 e Portaria MEC nº 315/2018 | Obrigatória para instituições de ensino superior | Guarda do acervo acadêmico. Aplicável porque o sistema trata cursos, períodos e disciplinas de ensino superior. Os prazos de cada documento seguem a Tabela de Temporalidade das atividades-fim das IES. |
| ABNT NBR ISO/IEC 27001:2022 e 27002:2022 | Boa prática | Controles de segregação de funções (5.3), direitos de acesso (5.18), registros, criptografia e cópias de segurança. |
| NIST SP 800-63B-4 (2025) | Boa prática | Senhas e segundo fator. Decisões e divergências justificadas em 8.9. |
| OWASP Top 10 | Boa prática | Principais falhas de segurança em aplicações web (ex.: A01 – Quebra de Controle de Acesso). |

# **4\. Definições**

| Termo | Definição |
| :---- | :---- |
| Dado pessoal | Informação relacionada a pessoa natural identificada ou identificável (LGPD, art. 5º, I). |
| Dado pessoal sensível | Dado sobre origem racial ou étnica, convicção religiosa, opinião política, saúde, vida sexual, dado genético ou biométrico, entre outros (LGPD, art. 5º, II). |
| Titular | Pessoa natural a quem se referem os dados pessoais (LGPD, art. 5º, V). |
| Log (registro) | Anotação automática de uma ação realizada no sistema: quem fez, o quê, quando e de onde. |
| MFA | Autenticação em dois fatores: além da senha, o usuário confirma sua identidade por um segundo meio. |
| Dupla aprovação | Controle em que uma pessoa solicita a operação e outra, diferente, a aprova. |
| Hash | Transformação irreversível da senha, que permite verificá-la sem armazená-la. |

# **5\. Princípios**

**5.1  Menor privilégio e necessidade:** cada usuário acessa somente os dados indispensáveis à sua função (LGPD, art. 6º, III).

**5.2  Segregação de funções:** nenhuma pessoa poderá executar e aprovar sozinha uma operação crítica, nem fiscalizar as próprias ações (ISO/IEC 27002, controle 5.3).

**5.3  Responsabilização:** toda ação deverá ser atribuível a um único usuário identificado (LGPD, art. 6º, X).

**5.4  Segurança desde a concepção:** os requisitos desta Política deverão ser implementados desde a fase de projeto (LGPD, art. 46, § 2º).

**5.5  Negação por padrão:** todo acesso nasce negado e somente é liberado de forma expressa.

# **6\. Como ler as seções seguintes**

As seções 7 a 13 descrevem o sistema na ordem em que ele é usado: primeiro quem o utiliza, depois o caminho de cada usuário desde a criação da conta, em seguida os módulos acadêmicos e, por fim, os mecanismos que funcionam em segundo plano (registros, proteção de dados e backup). Cada parte segue o mesmo formato:

–  **Como funciona** – o contexto e o fluxo da funcionalidade;

–  **O que o sistema deve ter** – os requisitos obrigatórios que a Equipe de Desenvolvimento deverá implementar, com a base legal entre parênteses quando houver.

# **7\. Quem usa o sistema e o que cada um pode fazer**

**COMO FUNCIONA**

O sistema possui cinco perfis permanentes e um perfil temporário de suporte. A coordenação (Admin Master) configura o sistema e aprova operações sensíveis; a secretaria (Admin Secundário) cadastra as pessoas; os professores lançam as notas das suas turmas; os alunos consultam suas informações e fazem matrícula; e o Auditor acompanha os registros de tudo o que acontece. Nenhum perfil reúne, sozinho, o poder de executar, aprovar e fiscalizar uma mesma ação.

Toda ação no sistema passa por três etapas: **autenticação** (confirmar quem é o usuário), **autorização** (verificar se o perfil dele permite a ação) e **registro** (gravar em log o que foi feito).

| Perfil | Atribuído a | Pode | Não pode |
| :---- | :---- | :---- | :---- |
| Admin Master | Coordenação (mínimo de 2 contas nominais) | Gerenciar perfis e permissões dos administradores secundários; definir os períodos de lançamento de notas; aprovar operações críticas. | Lançar ou editar notas; acessar a tela de logs; alterar as próprias permissões; aprovar a própria solicitação. |
| Admin Secundário | Secretaria e equipe administrativa | Ler, incluir, editar e excluir nos módulos concedidos pelo Admin Master (exclusões de registros acadêmicos sujeitas a 7.6); cadastrar alunos e professores; bloquear contas. | Definir, visualizar ou redefinir senhas; atribuir perfis administrativos. |
| Professor | Docentes | Consultar e lançar notas somente das turmas às quais está vinculado, dentro do período aberto, vendo apenas os dados mínimos dos alunos (9.2.3). | Acessar turmas não vinculadas ou demais dados pessoais dos alunos. |
| Aluno | Alunos cadastrados pela secretaria | Consultar as próprias notas, disciplinas e histórico; matricular-se (seção 9.1). | Acessar dados de outros alunos. |
| Auditor | Equipe designada pela direção | Consultar os logs (somente leitura); emitir relatórios; aprovar acessos excepcionais aos logs e restaurações após incidente. | Alterar qualquer dado acadêmico, cadastral ou de log. |
| Suporte Técnico (temporário) | Colaborador da Infraestrutura designado caso a caso | Consultar os logs somente no escopo e no prazo aprovados (10.8). | Alterar dados ou logs; manter o acesso após o prazo. |

**O QUE O SISTEMA DEVE TER**

**7.1**  Controle de acesso baseado em perfis: as permissões são atribuídas aos perfis, e os usuários recebem perfis, nunca permissões avulsas.

**7.2**  Cada permissão combina um módulo (ex.: Matrículas) e uma ação (Ler, Incluir, Editar ou Excluir). Todo perfil novo nasce sem nenhuma permissão.

**7.3**  A autorização é verificada no servidor (API) a cada requisição, inclusive quando o identificador de outro usuário é alterado na URL. Ocultar botões na tela não é controle de acesso (OWASP Top 10, A01).

**7.4**  A Equipe de Desenvolvimento não possui perfil nem credencial no ambiente de produção.

## **7.5 Operações críticas: dupla aprovação**

**COMO FUNCIONA**

Algumas operações são sensíveis demais para depender de uma única pessoa. Nelas, um Admin Master faz a solicitação, que fica pendente até que outro Admin Master a aprove ou recuse. Só após a aprovação o sistema executa a operação. Isso impede fraudes individuais, como alterar uma nota após o fechamento sem que ninguém saiba (ISO/IEC 27002, controle 5.3).

| 1\. Solicita Admin Master A pede, com justificativa | 2\. Pendente Fica aguardando na tela de aprovações | 3\. Aprova ou recusa Admin Master B decide | 4\. Executa Sistema realiza a operação | 5\. Registra Pedido, decisão e execução vão para o log |
| :---: | :---: | :---: | :---: | :---: |

**O QUE O SISTEMA DEVE TER**

**7.5.1**  Uma tela de aprovações pendentes, visível aos Admins Master.

**7.5.2**  Bloqueio da autoaprovação: o solicitante nunca pode aprovar a própria solicitação.

**7.5.3**  Justificativa obrigatória em toda solicitação.

**7.5.4**  Dupla aprovação obrigatória para: concessão ou revogação de permissões administrativas; inclusão ou substituição de Admin Master; correção de nota após o fechamento; exceções às regras de matrícula; exclusão de registros acadêmicos; exportação em massa de dados pessoais; restauração de dados após incidente.

## **7.6 Permissão não dispensa aprovação**

**COMO FUNCIONA**

A permissão define **quem pode solicitar** uma operação; a dupla aprovação define **quando ela é executada**. Assim, um Admin Secundário com permissão de Excluir no módulo de Notas pode pedir a exclusão de um registro acadêmico, mas a exclusão só ocorre depois da aprovação de um Admin Master. Ações que apenas reduzem riscos, como bloquear uma conta, não dependem de aprovação.

**O QUE O SISTEMA DEVE TER**

**7.6.1**  Quando um usuário com permissão aciona uma operação listada em 7.5.4, o sistema não a executa diretamente: cria uma solicitação pendente e a encaminha para aprovação.

**7.6.2**  Nenhuma combinação de permissões permite executar uma operação de 7.5.4 sem a aprovação correspondente.

# **8\. Ciclo de vida da conta do usuário**

Esta seção descreve, na ordem em que acontecem, todas as etapas pelas quais passa uma conta, da criação ao desligamento.

| 1\. Implantação Ativação do Master | 2\. Cadastro Admin cria o usuário | 3\. Ativação Usuário cria a senha | 4\. Login Senha \+ 2º fator | 5\. Sessão Uso e expiração | 6\. Recuperação Nova senha por link | 7\. Desligamento Bloqueio da conta |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |

## **8.1 Implantação: ativação do Admin Master**

**COMO FUNCIONA**

Quando o sistema é instalado, ainda não existe nenhum usuário. A Equipe de Infraestrutura registra apenas o nome e o e-mail institucional do coordenador, sem senha. O sistema envia a ele um link de ativação, pelo qual o próprio coordenador cria sua senha e cadastra o segundo fator. Assim, ninguém além dele conhece a senha em momento algum, nem a Equipe de Desenvolvimento.

**O QUE O SISTEMA DEVE TER**

**8.1.1**  Rotina de implantação que cria a conta Master sem senha e dispara o link de ativação.

**8.1.2**  Recomenda-se manter três contas Master (coordenação e duas substitutas, como a vice-coordenação), para que a dupla aprovação continue possível em férias e afastamentos. O sistema alerta a direção e o Auditor sempre que houver menos de duas contas Master ativas (8.8).

**8.1.3**  Registro em log da criação e da ativação.

## **8.2 Cadastro de usuários**

**COMO FUNCIONA**

Não existe autocadastro. A secretaria cadastra alunos e professores com os dados mínimos e escolhe o perfil. O administrador cria o usuário, mas nunca a senha: a credencial pertence somente ao titular. Assim, cada ação registrada pode ser atribuída a uma única pessoa, o que permite à instituição demonstrar quem fez o quê (LGPD, art. 6º, X).

**O QUE O SISTEMA DEVE TER**

**8.2.1**  Tela de cadastro acessível somente a perfis com permissão de cadastro.

**8.2.2**  Tela de cadastro **sem campo de senha**.

**8.2.3**  Perfis administrativos atribuídos somente pelo Admin Master, com dupla aprovação.

## **8.3 Ativação da conta e criação da senha**

**COMO FUNCIONA**

Após o cadastro, o sistema envia ao e-mail do usuário um link de uso único. Ao abri-lo, o usuário confirma o e-mail com um código enviado na hora, cria sua senha e, se o seu perfil exigir, configura o aplicativo autenticador (segundo fator). Nesse momento, o sistema também gera códigos de recuperação para o caso de perda do celular. A justificativa técnica dessas regras está em 8.9.

**O QUE O SISTEMA DEVE TER**

**8.3.1**  Link de ativação de uso único, válido por 24 horas, com confirmação do e-mail por código de uso único válido por 10 minutos.

**8.3.2**  Senha com, no mínimo, **12 caracteres** para perfis com segundo fator ativo e **15 caracteres** para alunos sem segundo fator, contendo letra maiúscula, letra minúscula, número e caractere especial.

**8.3.3**  Recusa de senhas presentes em lista de senhas comuns ou vazadas, ou que contenham o nome ou a matrícula do usuário, com indicação do motivo da recusa.

**8.3.4**  Sem troca periódica obrigatória de senha. A troca é exigida somente quando houver indício de comprometimento.

**8.3.5**  Armazenamento da senha somente com hash forte e salt (Argon2id ou bcrypt), nunca em texto puro ou com criptografia reversível.

**8.3.6**  Geração de 10 códigos de recuperação de uso único ao configurar o segundo fator, exibidos uma única vez ao usuário.

## **8.4 Login**

**COMO FUNCIONA**

O usuário informa login e senha. Para perfis com acesso a dados de outras pessoas, o sistema pede também o código de seis dígitos gerado pelo aplicativo autenticador instalado no celular do usuário.

**O QUE O SISTEMA DEVE TER**

**8.4.1**  Login individual e intransferível. Contas genéricas (ex.: "secretaria") são proibidas.

**8.4.2**  Segundo fator (MFA) por aplicativo autenticador (código temporário TOTP) obrigatório para Admin Master, Admin Secundário, Professor, Auditor e Suporte Técnico, e opcional para alunos. Cada código é aceito uma única vez.

**8.4.3**  O código enviado por e-mail não é aceito como segundo fator; serve apenas para confirmar o e-mail na ativação e na recuperação de senha (8.9).

**8.4.4**  Bloqueio da conta por 15 minutos após 5 tentativas incorretas, com registro em log e alerta ao Auditor.

**8.4.5**  Mensagem de erro genérica, sem indicar se o erro está no usuário ou na senha.

## **8.5 Sessão**

**O QUE O SISTEMA DEVE TER**

**8.5.1**  Encerramento automático da sessão após 15 minutos de inatividade para perfis administrativos, professores e auditores, e após 30 minutos para alunos.

## **8.6 Recuperação de senha**

**COMO FUNCIONA**

O usuário que esquecer a senha solicita a recuperação na tela de login e recebe um link no próprio e-mail. Nenhum administrador redefine senhas. Se o usuário perder o celular com o aplicativo autenticador, entra com um dos códigos de recuperação; se também não os tiver, comparece à secretaria para comprovar a identidade.

**O QUE O SISTEMA DEVE TER**

**8.6.1**  Link de redefinição de uso único, enviado somente ao e-mail cadastrado, válido por 30 minutos.

**8.6.2**  Redefinição do segundo fator, sem códigos de recuperação, somente após identificação presencial na secretaria e aprovação de um Admin Master, com registro em log. Para Admin Master, a aprovação cabe a outro Admin Master.

## **8.7 Bloqueio e desligamento**

**COMO FUNCIONA**

Quando um professor ou colaborador deixa a instituição, sua conta é bloqueada imediatamente, mas não apagada: o histórico de tudo o que fez continua disponível para auditoria. Como bloquear uma conta só reduz riscos, essa ação não depende de dupla aprovação.

**O QUE O SISTEMA DEVE TER**

**8.7.1**  Bloqueio imediato da conta no momento em que o desligamento for comunicado, com encerramento de todas as sessões ativas e invalidação de links e códigos pendentes.

**8.7.2**  Exclusão apenas lógica: o registro fica inativo, com o responsável e a data.

**8.7.3**  Relatório semestral de acessos administrativos, para revisão pelo Admin Master com acompanhamento do Auditor (ISO/IEC 27002, controle 5.18).

## **8.8 Contas Master: ausência, desligamento e contingência**

**COMO FUNCIONA**

A dupla aprovação depende de haver pelo menos dois Admins Master disponíveis. A segurança, porém, vem antes da disponibilidade: um Master desligado é bloqueado imediatamente, mesmo que reste apenas um. Cada situação tem um caminho definido, e nenhum deles dispensa supervisão:

| Situação | O que acontece | Quem aprova |
| :---- | :---- | :---- |
| Ausência planejada (férias, licença) | Um Master substituto, cadastrado previamente (8.1.2), assume as aprovações. A conta do ausente permanece ativa. | Fluxo normal (7.5). |
| Substituição de coordenador | Um Master registra a inclusão do novo coordenador, que ativa a conta pelo link (8.1). A conta anterior é bloqueada imediatamente após a ativação. | Outro Admin Master. |
| Desligamento que deixa apenas um Master | Bloqueio imediato. O sistema entra em **modo de conta única**: operações críticas ficam suspensas, exceto a inclusão de novo Master; direção e Auditor são alertados. A direção indica o novo Master em até 5 dias úteis. | O Master restante registra; a direção autoriza formalmente e o Auditor aprova no sistema. |
| Nenhum Master disponível (contingência) | A Equipe de Infraestrutura registra uma **conta Master emergencial** sem senha, ativada pelo link (8.1). A conta vale por até 30 dias ou até a nomeação regular, e todas as suas ações são marcadas como emergenciais. | Direção (autorização formal) e Auditor (aprovação no sistema). Ao final, o Auditor revisa todas as ações e reporta à direção. |

**O QUE O SISTEMA DEVE TER**

**8.8.1**  Modo de conta única: suspensão automática das operações de 7.5.4 enquanto houver menos de dois Masters ativos, exceto a inclusão de novo Master.

**8.8.2**  Aprovação pelo Auditor como segundo aprovador exclusivamente na inclusão de Master em modo de conta única ou em contingência.

**8.8.3**  Conta Master emergencial com validade máxima de 30 dias, bloqueio automático ao fim do prazo e marcação de todas as suas ações no log.

**8.8.4**  Registro, junto à solicitação, do documento de autorização da direção.

## **8.9 Justificativa técnica das regras de senha e segundo fator**

A referência técnica adotada é a **NIST SP 800-63B-4** (2025), guia do governo dos Estados Unidos sobre autenticação, amplamente usado como boa prática. A tabela registra cada decisão, o que a referência recomenda e a justificativa quando a Política se afasta dela.

| Decisão | O que a NIST SP 800-63B-4 recomenda | Justificativa |
| :---- | :---- | :---- |
| Senha mínima de 12 caracteres com segundo fator e de 15 sem segundo fator | Mínimo de 8 caracteres quando a senha é usada com segundo fator e de 15 quando é o único fator. | Segue a referência para o caso sem segundo fator e vai além dela no caso com segundo fator, como margem de segurança. |
| Exigência de maiúscula, minúscula, número e caractere especial | Não impor regras de composição; priorizar comprimento e lista de senhas proibidas. | **Divergência consciente:** a composição é requisito institucional do projeto. Para reduzir o efeito colateral (senhas previsíveis como "Senha@2026"), a Política combina a composição com a lista de senhas proibidas (8.3.3). |
| Lista de senhas comuns e vazadas | Obrigatória, com indicação do motivo da recusa. | Adotada integralmente (8.3.3). |
| Sem troca periódica obrigatória | Não exigir troca periódica; exigir troca se houver comprometimento. | Adotada integralmente (8.3.4). |
| Segundo fator por aplicativo autenticador (TOTP) | Códigos temporários (OTP) são autenticadores aceitos, com uso único de cada código e limite de tentativas. | Adotado: não tem custo, funciona em qualquer celular e não depende de rede. |
| Código por e-mail apenas para confirmar o e-mail | E-mail não deve ser usado como segundo fator; códigos de confirmação de e-mail e de recuperação são permitidos. | Adotada integralmente (8.4.3). Quem invade o e-mail não deve conseguir também o segundo fator. |

# **9\. Módulos acadêmicos**

As regras abaixo são regras de negócio e também de segurança. Por isso, deverão ser validadas no servidor e não poderão ser contornadas pela interface.

## **9.1 Matrícula**

**COMO FUNCIONA**

No período de matrícula, o aluno acessa a tela e o sistema lista apenas as disciplinas do seu período. Se o aluno tiver dependência (DP), a disciplina em DP aparece como obrigatória e deve ser escolhida primeiro. Depois disso, o aluno escolhe as demais disciplinas, e o sistema bloqueia as que tiverem conflito de horário com a DP.

| 1\. Acessa Aluno abre a matrícula | 2\. DP primeiro Matrícula obrigatória na DP | 3\. Demais Só disciplinas do seu período | 4\. Conflito Bloqueio se o horário colidir com a DP | 5\. Confirma Matrícula registrada em log |
| :---: | :---: | :---: | :---: | :---: |

**O QUE O SISTEMA DEVE TER**

**9.1.1**  Listagem restrita às disciplinas do período atual do aluno.

**9.1.2**  Matrícula obrigatória na disciplina em DP antes das demais.

**9.1.3**  Bloqueio de disciplina com conflito de horário com a DP.

**9.1.4**  Exceções somente por dupla aprovação (7.5), com justificativa.

## **9.2 Notas**

**COMO FUNCIONA**

As notas seguem um ciclo controlado pela coordenação. O Admin Master define quando o período de lançamento abre e fecha. Durante o período, cada professor lança as notas das suas turmas. No horário de fechamento, o sistema trava a edição automaticamente e gera uma cópia de segurança. Depois disso, qualquer correção depende de dupla aprovação.

| 1\. Abertura Master define datas | 2\. Lançamento Professor lança notas das suas turmas | 3\. Fechamento Trava automática no horário | 4\. Backup Cópia de fechamento | 5\. Correção Só com dupla aprovação |
| :---: | :---: | :---: | :---: | :---: |

**O QUE O SISTEMA DEVE TER**

**9.2.1**  Cadastro de data e hora de abertura e fechamento do período, exclusivo do Admin Master.

**9.2.2**  Trava baseada no horário do servidor, nunca no do computador do usuário. Fora do período, o professor tem acesso somente de leitura.

**9.2.3**  Professor restrito às turmas às quais está vinculado, visualizando somente os dados mínimos para lançar as notas: nome civil ou nome social do aluno, número de matrícula, turma, disciplina e as notas e a situação do aluno na sua própria disciplina. Os demais dados pessoais não são exibidos (LGPD, art. 6º, III).

**9.2.4**  Histórico de cada alteração de nota: valor anterior, novo valor, responsável, data e hora.

**9.2.5**  Correção após o fechamento somente por dupla aprovação (7.5).

## **9.3 Consulta pelo aluno**

**O QUE O SISTEMA DEVE TER**

**9.3.1**  O aluno visualiza somente as próprias notas, disciplinas e histórico. O identificador do aluno deve vir da sessão autenticada, e não de parâmetro enviado pela tela.

## **9.4 Exportação de dados**

**O QUE O SISTEMA DEVE TER**

**9.4.1**  Exportação de planilhas restrita a perfis autorizados e registrada em log.

**9.4.2**  Exportação em massa de dados pessoais somente com dupla aprovação (7.5).

# **10\. Registros (logs) e auditoria**

**COMO FUNCIONA**

Todas as ações descritas nas seções anteriores geram automaticamente um registro. Os registros ficam em uma base separada, na qual só é possível incluir novos itens, nunca alterar ou apagar. Apenas o perfil Auditor consulta os registros. Se o Admin Master precisar de informações para apurar um problema, ele as solicita ao Auditor. Assim, quem administra o sistema não fiscaliza a si mesmo. Esse registro atende ao dever de registrar as operações de tratamento de dados (LGPD, art. 37).

**O QUE O SISTEMA DEVE TER**

**10.1**  Cada registro contém: data e hora do servidor (sincronizada por NTP), usuário, perfil, endereço IP, ação, módulo, registro afetado, valor anterior, valor novo e resultado (sucesso ou falha).

**10.2**  Eventos registrados: login e logout, falhas de login, bloqueios, ativação de contas, criação e alteração de usuários e permissões, solicitações e aprovações de operações críticas, matrículas e exceções, lançamento e alteração de notas, abertura e fechamento de períodos, exclusões, exportações e execução de backups.

**10.3**  Base de logs separada, somente com inclusão de registros e protegida contra adulteração. Nenhum perfil, inclusive o Admin Master, pode editar ou apagar logs.

**10.4**  Tela de logs acessível somente ao perfil Auditor, com filtros por período, usuário, módulo e tipo de ação, e exportação para relatório. As consultas do Auditor também são registradas.

**10.5**  Senhas, tokens e códigos de verificação nunca são gravados em log.

**10.6**  Alertas automáticos ao Auditor para: alteração de permissões, sequência de falhas de login, tentativa de alteração de nota fora do período e exportação em massa.

**10.7**  Prazos de guarda:

| Tipo de registro | Prazo | Base |
| :---- | :---- | :---- |
| Logs de acesso (login, logout, falhas) | 1 ano | Mínimo de 6 meses (Marco Civil, art. 15), ampliado por decisão institucional |
| Logs de alteração de notas e matrículas | Mesmo prazo do registro acadêmico a que se referem | Tabela de Temporalidade das atividades-fim das IES (Decreto nº 9.235/2017 e Portaria MEC nº 315/2018) |
| Registro de incidentes de segurança | 5 anos | Resolução CD/ANPD nº 15/2024 |

## **10.8 Acesso excepcional aos logs**

**COMO FUNCIONA**

Às vezes, uma investigação técnica ou a correção de um erro exige que alguém além do Auditor consulte os logs. Para isso não se concede acesso permanente: cria-se um acesso temporário, limitado e vigiado. A Equipe de Infraestrutura solicita o acesso informando o motivo, o período e os módulos que precisa consultar; o Auditor aprova; o sistema ativa o perfil Suporte Técnico somente para aquele escopo e pelo prazo aprovado. Ao fim do prazo, o acesso é revogado automaticamente.

| 1\. Solicita Infraestrutura informa motivo, período e módulos | 2\. Aprova Auditor aprova ou recusa | 3\. Acessa Perfil Suporte, só leitura, só no escopo | 4\. Expira Revogação automática no prazo | 5\. Revisa Auditor confere o que foi consultado |
| :---: | :---: | :---: | :---: | :---: |

**O QUE O SISTEMA DEVE TER**

**10.8.1**  Perfil Suporte Técnico sem nenhuma permissão permanente, ativado apenas por solicitação aprovada pelo Auditor e vinculado a um usuário nominal.

**10.8.2**  Acesso somente de leitura, restrito ao período e aos módulos aprovados, com validade máxima de 8 horas, renovável por nova solicitação.

**10.8.3**  Revogação automática ao fim do prazo e registro de todas as consultas realizadas, com aviso ao Auditor.

**10.8.4**  Se a solicitação envolver investigação do próprio Auditor, a aprovação cabe à direção da instituição.

**10.9  Manutenção técnica da base de logs** (espaço em disco, desempenho, arquivamento após o prazo de guarda) é feita pela Equipe de Infraestrutura sem leitura nem alteração do conteúdo dos registros. Cada intervenção é registrada em trilha própria.

# **11\. Proteção dos dados**

## **11.1 Dados pessoais (LGPD)**

**COMO FUNCIONA**

O sistema trata dados pessoais de alunos e professores para executar o contrato educacional e cumprir obrigações legais (LGPD, art. 7º, V e II). Por isso, deve coletar apenas o necessário, proteger os dados mais sensíveis e permitir que cada titular acompanhe o que é feito com os seus dados.

**O QUE O SISTEMA DEVE TER**

**11.1.1**  Coleta apenas dos dados necessários à vida acadêmica (LGPD, art. 6º, III).

**11.1.2**  Dados pessoais sensíveis (ex.: laudos médicos e de necessidades especiais) com acesso restrito, criptografados e exibidos de forma mascarada quando não forem necessários (LGPD, art. 11).

**11.1.3**  Registro do consentimento de pelo menos um dos pais ou responsável legal, caso haja dados de crianças; dados de crianças e adolescentes tratados sempre no seu melhor interesse (LGPD, art. 14).

**11.1.4**  Funcionalidade para o titular consultar, corrigir e obter cópia dos seus dados (LGPD, art. 18).

**11.1.5**  Aviso de privacidade e contato do Encarregado de Dados na tela de login (LGPD, arts. 9º e 41).

**11.1.6**  Eliminação dos dados ao fim do tratamento, salvo os que devam ser conservados por obrigação legal, como o acervo acadêmico (LGPD, art. 16, I).

## **11.2 Criptografia e gestão de chaves**

**COMO FUNCIONA**

A criptografia protege os dados em dois momentos: quando trafegam pela rede e quando estão armazenados. As chaves que abrem esses dados ficam guardadas em um cofre próprio, sob responsabilidade da Equipe de Infraestrutura. A Equipe de Desenvolvimento implementa o uso da criptografia, mas não tem acesso às chaves de produção.

**O QUE O SISTEMA DEVE TER**

**11.2.1**  HTTPS com TLS 1.2 ou superior em toda comunicação.

**11.2.2**  Criptografia AES-256 para dados pessoais sensíveis e para todas as cópias de segurança.

**11.2.3**  Chaves em cofre de chaves (gerenciador de segredos), nunca no código-fonte, no banco de dados ou junto aos backups.

**11.2.4**  Rotação anual das chaves, ou imediata em caso de suspeita de vazamento, executada pela Equipe de Infraestrutura. Acesso ao cofre restrito a duas pessoas nominais.

## **11.3 Cópias de segurança (backup)**

**COMO FUNCIONA**

Os backups seguem a regra 3-2-1: três cópias dos dados (a de produção e mais duas), em dois tipos de mídia (HD físico e nuvem), sendo uma fora da instituição (a nuvem). Se o servidor falhar ou for atacado, os dados podem ser recuperados de qualquer uma das cópias (LGPD, art. 46).

| Tipo | Frequência | Destino | Retenção |
| :---- | :---- | :---- | :---- |
| Completo | Semanal (domingo) | HD físico \+ nuvem | 12 meses |
| Incremental | Diário, fora do horário de aula | HD físico \+ nuvem | 30 dias |
| Fechamento de semestre | Ao fim de cada semestre | HD físico \+ nuvem | 5 anos |

**O QUE O SISTEMA DEVE TER**

**11.3.1**  Rotina automática de backup conforme a tabela, com criptografia antes de a cópia sair do servidor (11.2.2).

**11.3.2**  HD físico guardado em local trancado e desconectado da rede após cada cópia (proteção contra ransomware), substituído a cada 3 anos ou ao primeiro sinal de falha.

**11.3.3**  Conta de nuvem exclusiva para backup, com MFA e cópias imutáveis até o fim da retenção. Se o provedor armazenar dados fora do Brasil, observar as regras de transferência internacional (LGPD, art. 33).

**11.3.4**  Teste mensal de restauração em ambiente separado, com registro do resultado.

**11.3.5**  Metas de recuperação: perda máxima de 24 horas de dados (RPO) e retorno do sistema em até 8 horas (RTO).

# **12\. Regras para o desenvolvimento**

**COMO FUNCIONA**

Estas regras não descrevem uma funcionalidade, e sim a forma como a Equipe de Desenvolvimento deve trabalhar para que as seções anteriores sejam implementadas com segurança desde o início (LGPD, art. 46, § 2º).

**O QUE O SISTEMA DEVE TER**

**12.1**  Ambientes de desenvolvimento, homologação e produção separados, sem acesso dos desenvolvedores ao ambiente e ao banco de produção.

**12.2**  Uso exclusivo de dados fictícios ou anonimizados em desenvolvimento e testes.

**12.3**  Proteção contra as falhas do OWASP Top 10, em especial: consultas parametrizadas (contra SQL Injection), validação de toda entrada e proteção contra XSS e CSRF.

**12.4**  Nenhuma senha, chave ou string de conexão no código-fonte ou no repositório.

**12.5**  Revisão de todo código por outro desenvolvedor (code review) antes da publicação.

**12.6**  Verificação e atualização das dependências contra vulnerabilidades conhecidas.

**12.7**  Mensagens de erro ao usuário sem detalhes técnicos.

# **13\. Resposta a incidentes**

**COMO FUNCIONA**

Um incidente é qualquer evento que comprometa a segurança dos dados, como acesso indevido, nota alterada sem autorização ou vazamento. Ao identificá-lo, a prioridade é conter o problema, preservar as evidências e corrigir a causa. Restaurar um backup **não** é automático: muitos incidentes (como um vazamento) não corrompem os dados, e uma restauração desnecessária apagaria lançamentos legítimos feitos depois da cópia. Por isso, a restauração só ocorre após análise técnica e autorização.

| 1\. Comunica Avisa Admin Master e Auditor | 2\. Contém Bloqueia a conta e preserva os logs | 3\. Analisa Auditor e Infraestrutura apuram a causa e o dano | 4\. Decide Restaurar só se houver dado corrompido ou perdido | 5\. Corrige Elimina a causa; restaura se autorizado | 6\. Notifica ANPD e titulares, se houver risco relevante | 7\. Registra Guarda por 5 anos |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |

**O QUE O SISTEMA DEVE TER**

**13.1**  Bloqueio imediato de conta envolvida, com preservação dos logs.

**13.2**  Restauração de dados somente quando cumpridas as três condições abaixo:

–  **Análise técnica:** relatório da Equipe de Infraestrutura confirmando dados corrompidos, alterados indevidamente ou perdidos, e indicando o que será restaurado;

–  **Integridade do backup:** verificação de que a cópia escolhida é anterior ao incidente e está íntegra, testada em ambiente separado antes de ir para produção;

–  **Autorização:** solicitação do Admin Master aprovada pelo Auditor; se o incidente envolver um Admin Master, a aprovação cabe à direção.

**13.3**  Antes de restaurar, o sistema guarda uma cópia do estado atual. Lançamentos legítimos feitos após o ponto de restauração são identificados pelos logs e relançados.

**13.4**  Restauração parcial (apenas os registros afetados) sempre que possível, em vez da restauração da base inteira.

**Responsabilidade do Encarregado de Dados:** havendo risco ou dano relevante aos titulares, comunicar a ANPD e os titulares em até 3 dias úteis e manter o registro do incidente por 5 anos (LGPD, art. 48; Resolução CD/ANPD nº 15/2024).

# **14\. Responsabilidades**

| Responsável | Atribuições |
| :---- | :---- |
| Admin Master (coordenação) | Gerenciar permissões; definir períodos de notas; aprovar operações críticas; revisar acessos semestralmente. |
| Admins Secundários | Cadastrar e manter usuários dentro das permissões recebidas; bloquear imediatamente as contas de desligados. |
| Recursos Humanos / direção | Comunicar à secretaria todo desligamento no momento em que ocorrer; autorizar formalmente inclusões de Master em modo de conta única ou contingência (8.8). |
| Professores | Lançar notas corretas e dentro do prazo; não compartilhar credenciais; proteger as informações dos alunos. |
| Alunos | Manter a senha em sigilo; comunicar qualquer acesso estranho à sua conta. |
| Auditor | Acompanhar os logs e alertas; apurar incidentes; aprovar acessos excepcionais aos logs, restaurações e inclusões de Master em contingência; emitir relatórios. |
| Equipe de Desenvolvimento | Implementar todos os requisitos desta Política; entregar relatório de desenvolvimento indicando como cada requisito foi atendido. |
| Equipe de Infraestrutura | Executar e testar backups; elaborar a análise técnica e executar restaurações autorizadas; custodiar as chaves criptográficas; manter servidores atualizados; registrar contas Master conforme 8.1 e 8.8. |
| Encarregado de Dados (DPO) | Garantir a conformidade com a LGPD; atender os titulares; comunicar incidentes à ANPD. |

# **15\. Descumprimento**

O descumprimento desta Política sujeitará o infrator a advertência, bloqueio de acesso e demais medidas disciplinares previstas no regimento da instituição, sem prejuízo das responsabilidades civis cabíveis. A instituição, como controladora dos dados, responde pelos danos causados aos titulares e está sujeita às sanções da ANPD (LGPD, arts. 42 e 52), razão pela qual o cumprimento desta Política é obrigatório para todos.

# **16\. Vigência e revisão**

Esta Política entra em vigor na data de sua aprovação e será revisada anualmente ou sempre que ocorrer incidente relevante ou alteração legal.