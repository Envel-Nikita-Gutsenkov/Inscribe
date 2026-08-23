export type Locale = "en" | "ru";

export interface Translations {
  common: {
    home: string;
    settings: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    loading: string;
    search: string;
    copy: string;
    copied: string;
    verify: string;
    login: string;
    username: string;
    password: string;
    passcode: string;
    poweredBy: string;
  };
  home: {
    portalTitle: string;
    portalDescription: string;
    recommendedProjects: string;
    browseDocs: string;
    noProjects: string;
  };
  reader: {
    projectProtected: string;
    projectProtectedDesc: string;
    sectionProtected: string;
    sectionProtectedDesc: string;
    emptyProject: string;
    emptyProjectDesc: string;
    pageNotFound: string;
    pageNotFoundDesc: string;
    returnHome: string;
    showMenu: string;
    closeMenu: string;
    onThisPage: string;
    tocTitle: string;
    protectedBadge: string;
    invalidCredentials: string;
    accessGranted: string;
    lockProject: string;
    lockProjectTooltip: string;
  };
  search: {
    placeholder: string;
    quickSearch: string;
    noResults: string;
    recentSearches: string;
    clearRecent: string;
    pressEsc: string;
    allProjects: string;
  };
  preferences: {
    title: string;
    subtitle: string;
    theme: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
    fontFamily: string;
    fontSize: string;
    lineSpacing: string;
    contentWidth: string;
    resetDefaults: string;
    adminConsole: string;
  };
}

export const translations: Record<Locale, Translations> = {
  en: {
    common: {
      home: "Home",
      settings: "Settings",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      loading: "Loading...",
      search: "Search",
      copy: "Copy",
      copied: "Copied!",
      verify: "Verify",
      login: "Login",
      username: "Username",
      password: "Password",
      passcode: "Passcode",
      poweredBy: "Powered by Inscribe",
    },
    home: {
      portalTitle: "Welcome to Inscribe",
      portalDescription: "Search for articles or select a documentation workspace below to get started.",
      recommendedProjects: "Recommended Projects",
      browseDocs: "Browse Docs",
      noProjects: "No public documentation spaces are currently available. Log in to the Admin Console to create a project and add content.",
    },
    reader: {
      projectProtected: "Project Protected",
      projectProtectedDesc: "This project is private. Enter the passcode to view the documentation.",
      sectionProtected: "Protected Section",
      sectionProtectedDesc: "This section requires authentication. Enter your login and password to view its documentation.",
      emptyProject: "Project is empty",
      emptyProjectDesc: "This documentation workspace has no published articles yet.",
      pageNotFound: "Page not found",
      pageNotFoundDesc: "The requested documentation page could not be found.",
      returnHome: "Return to Home",
      showMenu: "Show menu",
      closeMenu: "Close menu",
      onThisPage: "On this page",
      tocTitle: "Table of Contents",
      protectedBadge: "Protected",
      invalidCredentials: "Invalid username or password.",
      accessGranted: "Access granted.",
      lockProject: "Lock project",
      lockProjectTooltip: "Forget passcode and lock this project on this device",
    },
    search: {
      placeholder: "Search documentation...",
      quickSearch: "Quick Search",
      noResults: "No results found for",
      recentSearches: "Recent Searches",
      clearRecent: "Clear",
      pressEsc: "ESC to close",
      allProjects: "All Projects",
    },
    preferences: {
      title: "Reading Preferences",
      subtitle: "Customize your documentation reading experience",
      theme: "Theme",
      themeDark: "Dark",
      themeLight: "Light",
      themeSystem: "System",
      fontFamily: "Font Family",
      fontSize: "Font Size",
      lineSpacing: "Line Spacing",
      contentWidth: "Content Width",
      resetDefaults: "Reset Defaults",
      adminConsole: "Admin Console",
    },
  },
  ru: {
    common: {
      home: "Главная",
      settings: "Настройки",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      edit: "Редактировать",
      close: "Закрыть",
      loading: "Загрузка...",
      search: "Поиск",
      copy: "Копировать",
      copied: "Скопировано!",
      verify: "Подтвердить",
      login: "Войти",
      username: "Имя пользователя",
      password: "Пароль",
      passcode: "Код доступа",
      poweredBy: "Работает на Inscribe",
    },
    home: {
      portalTitle: "Добро пожаловать в Inscribe",
      portalDescription: "Ищите статьи или выберите проект документации ниже, чтобы начать чтение.",
      recommendedProjects: "Рекомендуемые проекты",
      browseDocs: "Читать документацию",
      noProjects: "В данный момент нет доступных публичных проектов. Войдите в панель администратора, чтобы создать проект и опубликовать статьи.",
    },
    reader: {
      projectProtected: "Проект защищен",
      projectProtectedDesc: "Этот проект приватный. Введите код доступа для просмотра документации.",
      sectionProtected: "Защищенный раздел",
      sectionProtectedDesc: "Этот раздел защищен. Введите логин и пароль для доступа к материалам раздела.",
      emptyProject: "Проект пуст",
      emptyProjectDesc: "В этом пространстве документации пока нет опубликованных статей.",
      pageNotFound: "Страница не найдена",
      pageNotFoundDesc: "Запрошенная страница документации не существует или была перемещена.",
      returnHome: "Вернуться на главную",
      showMenu: "Показать меню",
      closeMenu: "Скрыть меню",
      onThisPage: "На этой странице",
      tocTitle: "Оглавление",
      protectedBadge: "Защищено",
      invalidCredentials: "Неверный логин или пароль.",
      accessGranted: "Доступ разрешен.",
      lockProject: "Заблокировать проект",
      lockProjectTooltip: "Сбросить пароль и заблокировать проект на этом устройстве",
    },
    search: {
      placeholder: "Поиск по документации...",
      quickSearch: "Быстрый поиск",
      noResults: "Ничего не найдено по запросу",
      recentSearches: "Недавние поиски",
      clearRecent: "Очистить",
      pressEsc: "ESC для закрытия",
      allProjects: "Все проекты",
    },
    preferences: {
      title: "Настройки чтения",
      subtitle: "Персонализируйте отображение документации",
      theme: "Тема оформления",
      themeDark: "Темная",
      themeLight: "Светлая",
      themeSystem: "Системная",
      fontFamily: "Шрифт",
      fontSize: "Размер шрифта",
      lineSpacing: "Межстрочный интервал",
      contentWidth: "Ширина контента",
      resetDefaults: "Сбросить по умолчанию",
      adminConsole: "Консоль администратора",
    },
  },
};

export function getDictionary(locale?: string): Translations {
  const normalized = locale === "ru" ? "ru" : "en";
  return translations[normalized];
}
