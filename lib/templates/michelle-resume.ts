export const michelleResume = `%-------------------------
% Resume in Latex
% Author 
% Based off of: 
% License : MIT
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage[table]{xcolor}
\\definecolor{myblue}{HTML}{1F77B4} 
\\definecolor{darkblue}{HTML}{165682}
\\input{glyphtounicode}
\\usepackage{fontawesome5}

% \\usepackage{hyperref}
% \\hypersetup{
%   colorlinks=true,        % coloured text instead of coloured boxes
%   linkcolor=myblue,       % internal links (sections, equations)
%   urlcolor=myblue,        % bare URLs and \\href
%   citecolor=myblue        % bibliography links
% }


%----------FONT OPTIONS----------
% sans-serif
% \\usepackage[sfdefault]{FiraSans}
% \\usepackage[sfdefault]{roboto}
% \\usepackage[sfdefault]{noto-sans}
% \\usepackage[default]{sourcesanspro}

% serif
% \\usepackage{CormorantGaramond}
% \\usepackage{charter}


\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.6in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}



\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2.0pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeSubheadingSecond}[6]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
      \\textit{\\small#5}\\textit{\\small #6}  \\\\
    \\end{tabular*}\\vspace{-5pt}
}


\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{\$\\vcenter{\\hbox{\\tiny\$\\bullet\$}}\$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\input{projects.tex}

% Generic command: \\addproject{<Key>} inserts \\Project<Key>
\\newcommand{\\addproject}[1]{\\csname Project#1\\endcsname}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%


\\begin{document}

%----------HEADING----------
% \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
%   \\textbf{\\href{http://sourabhbajaj.com/}{\\Large Sourabh Bajaj}} & Email : \\href{mailto:sourabh@sourabhbajaj.com}{sourabh@sourabhbajaj.com}\\\\
%   \\href{http://sourabhbajaj.com/}{http://www.sourabhbajaj.com} & Mobile : +1-123-456-7890 \\\\
% \\end{tabular*}

\\begin{center}
    \\textcolor{myblue}{\\textbf{\\Huge \\scshape MICHELLE LU}}\\\\ \\vspace{1pt}
    \\small {437-988-6638} \$|\$ 
    \\href{https://michelle-portfolio-nu.vercel.app/}{\\textcolor{myblue}{\\underline{michelle-portfolio.app/}}} \$|\$ 
    \\href{mailto:michellelu547@gmail.com}{\\textcolor{myblue}{\\underline{michellelu547@gmail.com}}} \$|\$ 
    % \\href{mailto:m235lu@uwaterloo.ca}
    % {\\textcolor{myblue}
    % {\\underline{m235lu@uwaterloo.ca}}} \$|\$  
    % \\href{https://www.notion.so/current-21a63520178280569f22d4576f5739cb?source=copy_link}{\\textcolor{myblue}{\\underline{notion.so/michelle}}} \$|\$
    \\href{https://www.linkedin.com/in/michelle-lu-8b276b244/}{\\textcolor{myblue}{\\underline{linkedin.com/in/michellelu}}} \$|\$
    \\href{https://github.com/albertred}{\\textcolor{myblue}{\\underline{github.com/albertred}}}
\\end{center}


%-----------EDUCATION-----------
\\section{\\textcolor{darkblue}{Education}}
  \\resumeSubHeadingListStart
    \\resumeSubheadingSecond
      {University of Waterloo} {Waterloo, ON}
      {Candidate for Bachelor of Computer Science~\\textbar~\\textbf{91.00 Cumulative Average}}{Sep 2023 -- Dec 2027}
      {Relevant Courses:} { Algorithms, Operating Systems, Introduction to Optimization (Adv)}
    \\resumeSubHeadingListEnd

%
%-----------PROGRAMMING SKILLS-----------
\\section{\\textcolor{darkblue}{Technical Skills}}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: TypeScript, Python, C++, C} \\\\
     \\textbf{Frameworks/Tools}{: React, Node.js, PyTorch, LangChain, MCP, FastAPI, Git, Linux} \\\\
     % \\href{https://www.notion.so/current-21a63520178280569f22d4576f5739cb?source=copy_link}{\\textbf{Current Interests}{ {\\scriptsize{\\faLink\\ }}: Neuro AI, Building an LLM From Scratch}}%
     %\\textbf{Developer Tools}{: Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse} \\\\%
     %\\textbf{Libraries}{: pandas, NumPy, Matplotlib}%
    }}
 \\end{itemize}

%-----------EXPERIENCE-----------
\\section{\\textcolor{darkblue}{Experience}}
  \\resumeSubHeadingListStart
      \\resumeSubheading
      {AI Software Engineer Co-op}{Jan 2026 -- May 2026}
      {AXL: Human Potential, AI Superpowered}{Toronto, ON}
      \\resumeItemListStart
        % \\resumeItem{Building a \\textbf{SwiftUI macOS} app exploring \\textbf{novel human-AI interaction paradigms} from concept to launch on a \\textbf{4-person team}, owning core AI-driven product surfaces in a fast-paced startup environment}
        \\resumeItem{Designed and shipped \\textbf{novel human-AI interaction paradigms} in a \\textbf{SwiftUI macOS} app on a 4-person team, owning core product surfaces from concept to launch}
        \\resumeItem{Engineered \\textbf{multi-phase LLM orchestration pipelines} spanning \\textbf{prompt engineering, tool use, response parsing, and UI rendering} to enable dynamic, context-aware AI interactions}
        \\resumeItem{Improved \\textbf{agent reliability} by \\textbf{20\\%} through retry mechanisms, fallback prompting, and \\textbf{a model response evaluation} framework combining human review and LLM-as-judge scoring}
        % \\resumeItem{Engineered \\textbf{multi-phase LLM orchestration} pipelines spanning prompt design, response parsing, and UI rendering to enable \\textbf{adaptive AI-driven interactions}}
        % \\resumeItem{Architected a dynamic UI system with \\textbf{multi-phase LLM orchestration} to reactively render and populate UI controls based on selected mixed-media content}
        % \\resumeItem{Designed core infrastructure for 
        % \\textbf{rich-text preservation} and seamless copy-back workflows across applications}
        % \\resumeItem{Shipped features from custom analytics and replay systems to SwiftUI surfaces and LLM iteration loops}
        
      \\resumeItemListEnd
      \\resumeSubheading
      {Undergraduate Research Assistant}{Sep 2025 -- Jan 2026}
      {Vision and Image Processing Lab, University of Waterloo}{Waterloo, ON}
      \\resumeItemListStart
        \\resumeItem{Investigated \\textbf{real-time analytics applications} of \\textbf{3D human pose estimation} in baseball pitching}
        \\resumeItem{Implemented and optimized \\textbf{Temporal Convolutional Network} models with \\textbf{attention mechanism} on 3D joint data from motion-capture sequences (20K frames), achieving \\textbf{80\\%+ pitch-type classification accuracy}}
        % \\resumeItem{Applying \\textbf{SHAP feature attribution} and statistical analysis to identify key factors influencing pitch type}
        \\resumeItem{\\textbf{Second author} to \\textbf{“Interpretable Pre-Release Baseball Pitch Type Anticipation from Broadcast 3D Kinematics”} \\href{https://arxiv.org/abs/2603.04874}{\\underline{(arXiv:2603.04874)}}, accepted to \\textbf{CVPRW 2026}}
        
      \\resumeItemListEnd

    \\resumeSubheading
      {Software Development Co-op}{May 2025 -- Aug 2025}
      {Rocket}{Remote}
      \\resumeItemListStart
        \\resumeItem{Developed workflow features from design to implementation for a banker-facing application with \\textbf{C\\#, WPF, and SQL}, contributing to the goal of improving banker workflow speed by 30\\% }
        \\resumeItem{Refactored \\textbf{.NET Core APIs} to support critical functionality and validated changes with Insomnia and MSTest}
        \\resumeItem{Led bi-weekly retrospectives to identify bottlenecks and implement process improvements, \\textbf{reducing sprint planning time by 50\\%} and improving sprint delivery consistency for a 7-person team  }
      \\resumeItemListEnd
      
% -----------Multiple Positions Heading-----------
%    \\resumeSubSubheading
%     {Software Engineer I}{Oct 2014 - Sep 2016}
%     \\resumeItemListStart
%        \\resumeItem{Apache Beam}
%          {Apache Beam is a unified model for defining both batch and streaming data-parallel processing pipelines}
%     \\resumeItemListEnd
%    \\resumeSubHeadingListEnd
%-------------------------------------------

    % \\resumeSubheading
    %   {\\href{https://github.com/sherryliu-lsy/BLOB}{Undergraduate Researcher, UR2PhD Program \\scriptsize{\\faLink\\ }}}{Sep 2024 -- Feb 2025}
    %   {University of Waterloo}{Waterloo, ON}
    %   \\resumeItemListStart
    %     \\resumeItem{Worked in a team of 4 students to investigate the \\textbf{effects of activation functions} on the stability and convergence \\textbf{predictive coding networks}, an emerging biologically inspired deep learning architecture} 
    %     \\resumeItem{Implemented and evaluated \\textbf{regression models and neural networks} in \\textbf{PyTorch}, using \\textbf{NumPy} and \\textbf{Matplotlib} for data preprocessing, analysis, and visualization in real-world prediction tasks}
    %     \\resumeItem{Delivered a \\textbf{research presentation} summarizing literature review, methodological design, and results}
    % \\resumeItemListEnd

    \\resumeSubheading
      {Software Development Co-op}{May 2024 -- Aug 2024}
      {Ontario Public Service}{Toronto, ON}
      \\resumeItemListStart
        \\resumeItem{\\textbf{Reduced testing time by 80\\%} by developing an \\textbf{automated regression test suite} with Playwright Python on the BPS Secure project, improving QA efficiency and enabling faster release cycles} 
        \\resumeItem{Enhanced application performance and user experience by \\textbf{resolving defects} in an \\textbf{Angular} application}
        \\resumeItem{\\textbf{Expanded product accessibility} with bilingual UI testing support and managed user data via \\textbf{Python scripts}}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd


%-----------PROJECTS-----------
\\section{\\textcolor{darkblue}{Projects}}
    \\resumeSubHeadingListStart
     \\resumeProjectHeading
          {\\textbf{Notion Notes Agent} \$|\$ \\emph{TypeScript, Node.js, Notion API}}{}
          \\resumeItemListStart
            \\resumeItem{ Building an \\textbf{agentic application} that autonomously retrieves, synthesizes, and reasons over personal Notion notes using \\textbf{tool use} and \\textbf{multi-step planning} to answer natural-language queries}
          \\resumeItemListEnd
    \\resumeProjectHeading
          {\\href{https://github.com/albertred/Spotify-MCP}{\\textbf{Spotify MCP \\scriptsize{\\faLink\\ }}} \$|\$ \\emph{TypeScript, Node.js, Spotify API}}{}
          \\resumeItemListStart
            \\resumeItem{Built a custom \\textbf{Model Context Protocol server} to connect Claude Desktop with the \\textbf{Spotify API}}
            \\resumeItem{Enabled playlist creation and \\textbf{personalized music management} through natural language commands}
          \\resumeItemListEnd
          
    \\resumeProjectHeading
          {\\textbf{Zoob: Semantic Zoom with AI} \$|\$ \\emph{TypeScript, Next.js, Tailwind CSS}}{}
          \\resumeItemListStart
          \\resumeItem{Created \\textbf{Zoob}, an \\textbf{LLM-powered semantic zoom interface} that adapts content to users’ level of focus, transitioning from task overviews to documents to paragraph-level detail}
          \\resumeItem{Developed an interactive \\textbf{infinite canvas UI} with graph-based nodes and smooth zoom transitions}
            % \\resumeItem{Built \\textbf{Zoob}, an \\textbf{LLM-driven system} that adapts to user focus, enabling \\textbf{context-aware task workflows}}
            % \\resumeItem{Designed a \\textbf{graph-based data model} and \\textbf{two-pass ingest pipeline} to transform unstructured LLM outputs into structured task DAGs, separating parsing and refinement stages for improved consistency and composability}
            % \\resumeItem{Developed an \\textbf{infinite canvas interface} with \\textbf{DAG-based layout} and a \\textbf{workflow capture pipeline}, enabling interactive semantic zooming and AI-driven transformations of user workflows}
          \\resumeItemListEnd
    %      \\resumeProjectHeading
    %     {\\href{https://github.com/albertred/muse}{\\textbf{Muse - Poetry Sharing Site \\scriptsize{\\faLink\\ }}} \$|\$ \\emph{Typescript, Express.js, LangChain, OpenAI API}}{Oct 2025 - Present}
    %       \\resumeItemListStart
    %       \\resumeItem{Developed a \\textbf{TypeScript} web app that lets users craft poems from a \\textbf{daily set of generated words}}
    %     \\resumeItem{Integrating word-generation pipelines using embeddings and prompt chaining with \\textbf{LangChain} to create word sets}
    %     \\resumeItemListEnd
        % \\resumeProjectHeading
    %     {\\textbf{Ray Tracer} \$|\$ \\emph{C++}}{Oct 2025 - Present}
    %     \\resumeItemListStart
    %         \\resumeItem{Implementing a \\textbf{CPU-based ray tracer} by following \\textit{Ray Tracing in One Weekend}, applying concepts such as vector algebra, intersection testing, and recursive light scattering}
    %         \\resumeItem{Deepening understanding of \\textbf{graphics programming} and \\textbf{low-level performance optimization} in \\textbf{C++}}
    % \\resumeItemListEnd

     % \\resumeProjectHeading
     %      {\\textbf{WLP4 Compiler} \$|\$ \\emph{C++}}{Jan 2025 - Apr 2025}
     %      \\resumeItemListStart
     %        \\resumeItem{Built a full \\textbf{C++ compiler} for WLP4, a C subset including functions and pointers, translating to MIPS assembly}
     %        \\resumeItem{Implemented \\textbf{key compiler stages} including scanning, parsing, semantic analysis, and code generation}
     %        \\resumeItemListEnd
    % \\resumeProjectHeading
    % {\\href{https://github.com/sherryliu-lsy/BLOB}{\\textbf{Research Project, UR2PhD} \\scriptsize{\\faLink\\ }} \$|\$ \\emph{PyTorch, NumPy, Matplotlib}}{Sep 2024 -- Feb 2026}
    % \\resumeItemListStart
    %     \\resumeItem{Investigated the \\textbf{effects of activation functions} on the stability and convergence of \\textbf{predictive coding networks}, an emerging biologically inspired deep learning architecture, in a team of 4 students}
    %     \\resumeItem{Implemented and evaluated \\textbf{regression models and neural networks} in \\textbf{PyTorch}, leveraging \\textbf{NumPy} and \\textbf{Matplotlib} for data preprocessing, analysis, and visualization on real-world prediction tasks}
    % \\resumeItemListEnd
     % \\resumeProjectHeading
     %      {\\textbf{Watan, CS246 Final Project} \$|\$ \\emph{C++}} {Nov 2024 -- Dec 2024}
     %      \\resumeItemListStart
     %        \\resumeItem{Designed and implemented Watan, a \\textbf{C++} implementation of the game Settlers of Catan with a text interface}
     %        \\resumeItem{Collaborated in a team of two, utilizing \\textbf{object-oriented programming principles and design patterns} such as model view controller to achieve modularity and maintainability}
     %      \\resumeItemListEnd
       % \\resumeProjectHeading
       %    {\\textbf{Events Coordinator, WiSTEM}} {Sep 2024 -- Apr 2025}
       %    \\resumeItemListStart
       %      \\resumeItem{Fostering a sense of community and creating professional opportunities for \\textbf{underrepresented groups in STEM}}
       %      \\resumeItem{\\textbf{Planned and executed 7 events} with a 15-person team, engaging 100+ attendees across STEM disciplines}
       %      % \\resumeItem{\\textbf{Led planning of events} targeting women in STEM, coordinating a 15-person team and engaging \\textbf{100+} attendees}
       %    \\resumeItemListEnd
          % \\resumeProjectHeading
          % {\\href{https://devpost.com/software/mingo-ua6mey}{\\textbf{Mingo, Hack the North \\scriptsize{\\faLink\\ }}}\$|\$ \\emph{Cohere API, React, TailwindCSS}}{Sep 2024}
          % \\resumeItemListStart
          %   \\resumeItem{Developed a web application in collaboration with 3 teammates to enhance attendee experiences at networking events with a user-friendly UI for exploring event venues created using \\textit{React} and \\textit{TailwindCSS}}
          %   \\resumeItem{Integrated Cohere’s API to generate AI summaries of verbal conversations, enhancing recall and accessibility}
          % \\resumeItemListEnd
    % \\resumeProjectHeading
    %       {\\href{https://devpost.com/software/fridge-friend-07xzct}{\\textbf{FridgeFriend, Technova Best UI/UX Winner \\scriptsize{\\faLink\\ }}} \$|\$ \\emph{Python, PropelAuth, MongoDB Atlas}}{} 
    %       \\resumeItemListStart
    %         \\resumeItem{Built a web application with \\textbf{Streamlit Python} that recommends recipes to users based on input of food images, using image detection with \\textbf{YOLOv5} and a \\textbf{vectorizer trained} on a Kaggle recipe dataset}
    %         \\resumeItem{Implemented \\textbf{user authentication with PropelAuth} and stored user recipe data using \\textbf{MongoDB Atlas}}
    %       \\resumeItemListEnd
    % \\resumeProjectHeading
    %    {\\href{https://github.com/albertred/payroll_system}
    %       {\\textbf{Payroll Management Software \\scriptsize{\\faLink\\ }}} \$|\$ \\emph{Python, Django}} {Jun 2023 - Aug 2023}
    %       \\resumeItemListStart
    %         \\resumeItem{Developed a payroll system using \\textbf{Django} to \\textbf{automate PDF generation of paystubs} from Excel data}
    %         \\resumeItem{Leveraged \\textbf{Pandas} and \\textbf{Openpyxl} for data processing and PyPDF2 for document creation}
    %       \\resumeItemListEnd

% \\resumeSubHeadingListEnd

% \\section{\\textcolor{darkblue}{Hackathons}}
%     \\resumeSubHeadingListStart

%           \\resumeProjectHeading
%           {\\href{https://devpost.com/software/mingo-ua6mey}{\\textbf{Mingo, Hack the North \\scriptsize{\\faLink\\ }}}\$|\$ \\emph{Cohere API, React, TailwindCSS}}{Sep 2024}
%           \\resumeItemListStart
%             \\resumeItem{Developed a web application to enhance attendee experience at events created using \\textbf{React} and \\textbf{TailwindCSS}}
%             \\resumeItem{\\textbf{Integrated Cohere’s API} to generate AI summaries of verbal conversations, enhancing recall and accessibility}
%           \\resumeItemListEnd
%     \\resumeProjectHeading
%           {\\href{https://devpost.com/software/fridge-friend-07xzct}{\\textbf{FridgeFriend, Technova Best UI/UX Winner \\scriptsize{\\faLink\\ }}} \$|\$ \\emph{Python, MongoDB Atlas}} {Sep 2024}
%           \\resumeItemListStart
%             \\resumeItem{Built a web application with \\textbf{Streamlit Python} that recommends recipes to users based on input of food images, created with image detection using YOLOv5 and a \\textbf{vectorizer trained recipe dataset} from Kaggle}
%             \\resumeItem{Implemented \\textbf{user authentication with PropelAuth} and stored user recipe data using \\textbf{MongoDB Atlas}}
%           \\resumeItemListEnd

% \\resumeSubHeadingListEnd


%-------------------------------------------
\\end{document}
`
