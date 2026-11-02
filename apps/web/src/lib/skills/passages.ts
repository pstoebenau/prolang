export const stages = [
  'Starting',
  'Developing',
  'Confident',
  'Stretching',
] as const;
export interface Passage {
  id: string;
  title: string;
  level: number;
  text: string;
  placement?: boolean;
}
// Original learning material, CC0. Stages describe task difficulty, not CEFR certification.
export const passages: Passage[] = [
  {
    id: 'placement-0',
    title: 'Ein neuer Tag',
    level: 0,
    placement: true,
    text: 'Heute stehe ich früh auf. Ich öffne das Fenster und höre die Vögel. In der Küche mache ich Kaffee. Meine Freundin kommt zum Frühstück. Wir essen Brot und sprechen über unseren Tag. Danach gehen wir zusammen zum Bahnhof.',
  },
  {
    id: 'placement-1',
    title: 'Ein anderer Weg',
    level: 1,
    placement: true,
    text: 'Als ich gestern nach Hause fahren wollte, fiel mein Zug aus. Zuerst ärgerte ich mich, weil ich müde war. Dann beschloss ich, einen Teil des Weges zu Fuß zu gehen. Dabei entdeckte ich ein kleines Café, an dem ich sonst immer vorbeifahre. Die unerwartete Pause tat mir gut.',
  },
  {
    id: 'placement-2',
    title: 'Gemeinsam entscheiden',
    level: 2,
    placement: true,
    text: 'Obwohl sich die Nachbarn grundsätzlich einig waren, führte die Planung des gemeinsamen Gartens zu einer lebhaften Diskussion. Während einige möglichst viel Gemüse anbauen wollten, wünschten sich andere einen ruhigen Treffpunkt. Schließlich vereinbarten sie, zunächst verschiedene Vorschläge auszuprobieren, bevor sie eine endgültige Entscheidung treffen würden.',
  },
  {
    id: 'morning',
    title: 'Ein ruhiger Morgen',
    level: 0,
    text: 'Am Samstag habe ich Zeit. Ich stehe um acht Uhr auf und öffne das Fenster. Die Luft ist frisch und die Straße ist noch ruhig. In der Küche mache ich Tee und schneide Brot. Ich esse Käse und einen Apfel. Danach rufe ich meine Schwester an. Sie wohnt in einer anderen Stadt. Wir sprechen über unsere Woche und lachen viel. Später gehe ich zum Markt. Dort kaufe ich Tomaten, Kartoffeln und Blumen. Der Verkäufer ist freundlich. Zu Hause stelle ich die Blumen auf den Tisch. Am Nachmittag lese ich ein Buch auf dem Sofa. Heute muss ich nicht arbeiten. Das ist schön.',
  },
  {
    id: 'park',
    title: 'Ein Nachmittag im Park',
    level: 0,
    text: 'Heute scheint die Sonne. Ich treffe meinen Freund vor dem Park. Er bringt Wasser mit und ich habe zwei Brötchen dabei. Wir gehen langsam am See entlang. Auf dem Wasser schwimmen kleine Enten. Ein Kind zeigt auf einen großen Vogel. Seine Mutter macht ein Foto. Wir suchen eine Bank unter einem Baum und setzen uns hin. Mein Freund erzählt von seiner neuen Wohnung. Sie ist klein, aber hell. Am Sonntag möchte er uns zum Essen einladen. Ich freue mich schon darauf. Nach einer Stunde gehen wir weiter. Am Eingang kaufen wir ein Eis. Dann fahren wir mit dem Bus nach Hause.',
  },
  {
    id: 'kitchen',
    title: 'Zusammen kochen',
    level: 0,
    text: 'Am Abend kommt meine Freundin zu Besuch. Wir möchten zusammen kochen. Zuerst sehen wir in den Kühlschrank. Wir haben Gemüse, Eier und etwas Milch. Im Schrank finden wir Reis und Salz. Meine Freundin wäscht die Karotten. Ich schneide die Zwiebeln und stelle einen Topf auf den Herd. Das Wasser wird langsam heiß. Wir hören Musik und sprechen über das Essen. Nach zwanzig Minuten ist alles fertig. Ich decke den Tisch und hole zwei Gläser. Das Essen schmeckt gut. Danach waschen wir die Teller und räumen die Küche auf. Zum Schluss trinken wir Tee. Es ist ein einfacher und sehr schöner Abend.',
  },
  {
    id: 'journey',
    title: 'Eine kleine Reise',
    level: 1,
    text: 'Letzten Monat bin ich mit meiner Schwester ans Meer gefahren. Wir hatten die Reise schon lange geplant, aber erst am Freitag unsere Taschen gepackt. Als wir am Bahnhof ankamen, regnete es stark. Zum Glück war der Zug pünktlich. Während der Fahrt erzählte meine Schwester von ihrer Arbeit, und ich sah aus dem Fenster. Gegen Mittag erreichten wir unser Ziel. Unsere Unterkunft lag in einer ruhigen Straße, nur wenige Minuten vom Strand entfernt. Obwohl es noch kühl war, gingen wir sofort spazieren. Später fanden wir ein Restaurant mit frischem Fisch. Am nächsten Morgen schien die Sonne. Wir beschlossen, noch einen Tag länger zu bleiben, weil uns die Ruhe so gut gefiel.',
  },
  {
    id: 'course',
    title: 'Der erste Kursabend',
    level: 1,
    text: 'Seit einigen Wochen besuche ich einen Kochkurs. Am ersten Abend war ich etwas nervös, denn ich kannte niemanden. Die Lehrerin begrüßte uns freundlich und erklärte, was wir vorbereiten sollten. Ich arbeitete mit einem älteren Mann zusammen, der bisher nur selten gekocht hatte. Wir mussten zuerst das Gemüse schneiden und danach eine Soße machen. Dabei verwechselte ich Zucker und Salz. Zum Glück bemerkten wir den Fehler rechtzeitig und konnten von vorne anfangen. Als das Essen fertig war, setzten sich alle an einen langen Tisch. Wir probierten die verschiedenen Gerichte und erzählten von unseren Erfahrungen. Jetzt freue ich mich jede Woche auf den Kurs. Ich lerne dort nicht nur neue Rezepte, sondern auch interessante Menschen kennen.',
  },
  {
    id: 'move',
    title: 'Die neue Nachbarschaft',
    level: 1,
    text: 'Vor drei Monaten bin ich in eine neue Wohnung gezogen. Am Anfang vermisste ich meine alte Nachbarschaft, weil ich dort jeden Weg kannte. Hier musste ich erst herausfinden, wo ich einkaufen konnte und welcher Bus zur Arbeit fuhr. Eines Morgens traf ich im Treppenhaus eine Nachbarin. Sie fragte, ob ich Lust auf einen Kaffee hätte. Wir unterhielten uns lange, und sie gab mir viele hilfreiche Tipps. Seitdem grüßen wir uns jeden Tag. Inzwischen habe ich auch eine kleine Bäckerei entdeckt, deren Brot besonders gut schmeckt. Der Weg zur Arbeit dauert zwar etwas länger, aber dafür liegt ein schöner Park direkt vor meiner Tür. Langsam fühle ich mich hier wirklich zu Hause.',
  },
  {
    id: 'garden',
    title: 'Ein Garten für alle',
    level: 2,
    text: 'In unserem Viertel lag seit Jahren ein Grundstück ungenutzt zwischen zwei Wohnhäusern. Als die Stadt nach Ideen für die Fläche fragte, schlugen einige Bewohner einen Gemeinschaftsgarten vor. Zunächst waren nicht alle begeistert. Manche befürchteten zusätzlichen Lärm, andere zweifelten daran, dass sich dauerhaft genügend Freiwillige finden würden. Trotzdem begann eine kleine Gruppe damit, den Boden vorzubereiten. Wer keine Erfahrung hatte, konnte von den älteren Nachbarn lernen. Schon nach wenigen Monaten wuchsen dort Kräuter, Tomaten und Blumen. Besonders überraschend war, wie viele Gespräche bei der gemeinsamen Arbeit entstanden. Inzwischen gibt es feste Zeiten für die Pflege und regelmäßige Treffen. Der Garten liefert zwar nur wenig Gemüse, doch er hat das Zusammenleben im Viertel spürbar verändert. Auch die anfänglichen Kritiker kommen mittlerweile gerne vorbei.',
  },
  {
    id: 'work',
    title: 'Arbeiten von zu Hause',
    level: 2,
    text: 'Seit mein Unternehmen flexible Arbeitszeiten eingeführt hat, arbeite ich an zwei Tagen pro Woche von zu Hause. Anfangs genoss ich vor allem, dass der lange Weg ins Büro wegfiel. Allerdings stellte ich bald fest, dass es schwierig sein kann, Arbeit und Freizeit klar zu trennen. Oft beantwortete ich abends noch Nachrichten, obwohl mein Arbeitstag längst vorbei war. Deshalb habe ich mir feste Regeln gegeben. Ich beginne jeden Morgen zur gleichen Zeit und mache mittags einen kurzen Spaziergang. Nach Feierabend schalte ich den Computer aus. Für Besprechungen, bei denen neue Ideen entstehen sollen, fahre ich weiterhin lieber ins Büro. Der persönliche Austausch lässt sich durch einen Bildschirm nur teilweise ersetzen. Für mich funktioniert die Mischung am besten, solange alle im Team wissen, wann sie einander erreichen können.',
  },
  {
    id: 'repair',
    title: 'Reparieren statt wegwerfen',
    level: 2,
    text: 'Als meine alte Lampe plötzlich nicht mehr funktionierte, wollte ich zunächst eine neue bestellen. Eine Freundin erzählte mir jedoch von einer Werkstatt, in der Freiwillige bei kleinen Reparaturen helfen. Am Samstag nahm ich die Lampe mit und wurde freundlich empfangen. Ein Mitarbeiter erklärte mir geduldig, wie wir den Fehler suchen würden. Es stellte sich heraus, dass nur ein Kabel beschädigt war. Während er es ersetzte, unterhielten wir uns darüber, weshalb so viele brauchbare Dinge im Müll landen. Häufig fehlen den Menschen entweder die nötigen Kenntnisse oder die passenden Werkzeuge. Nach einer Stunde konnte ich meine Lampe wieder mitnehmen. Seit diesem Besuch überlege ich genauer, bevor ich etwas ersetze. Nicht jede Reparatur lohnt sich, aber oft ist mehr möglich, als man zunächst denkt.',
  },
  {
    id: 'mobility',
    title: 'Wem gehört die Straße?',
    level: 3,
    text: 'Die geplante Umgestaltung einer viel befahrenen Straße hat in unserer Stadt eine grundsätzliche Debatte ausgelöst. Befürworter erwarten, dass breitere Gehwege und geschützte Radstreifen die Lebensqualität verbessern würden. Geschäftsinhaber hingegen befürchten Umsatzeinbußen, falls Parkplätze wegfallen. Beide Seiten berufen sich auf Erfahrungen aus anderen Städten, deren Voraussetzungen allerdings nur bedingt vergleichbar sind. Statt sofort eine dauerhafte Lösung umzusetzen, soll deshalb zunächst ein zeitlich begrenzter Versuch stattfinden. Während dieser Phase werden Verkehrsströme gemessen und Anwohner regelmäßig befragt. Entscheidend wird sein, welche Kriterien bei der anschließenden Bewertung berücksichtigt werden. Schließlich lässt sich der Nutzen öffentlicher Räume nicht ausschließlich an der Geschwindigkeit messen, mit der Autos sie durchqueren. Ebenso wichtig sind Sicherheit, Zugänglichkeit und die Möglichkeit, sich dort ohne Kaufzwang aufzuhalten. Ein überzeugender Kompromiss muss diese unterschiedlichen Bedürfnisse ernst nehmen.',
  },
  {
    id: 'information',
    title: 'Information und Vertrauen',
    level: 3,
    text: 'Je leichter Informationen zugänglich werden, desto anspruchsvoller wird die Aufgabe, ihre Verlässlichkeit einzuschätzen. Ein überzeugend formulierter Beitrag kann auf gründlicher Recherche beruhen, aber ebenso gut unbelegte Behauptungen enthalten. Besonders schwierig ist die Beurteilung, wenn eine Nachricht genau das bestätigt, was wir ohnehin glauben. In solchen Fällen lohnt es sich, bewusst nach widersprechenden Quellen zu suchen. Dabei bedeutet kritisches Denken keineswegs, grundsätzlich jeder Aussage zu misstrauen. Vielmehr geht es darum, zwischen nachvollziehbaren Belegen, persönlichen Einschätzungen und offenen Fragen zu unterscheiden. Auch seriöse Berichterstattung kann Fehler enthalten; entscheidend ist, wie transparent diese korrigiert werden. Wer Informationen weitergibt, trägt deshalb eine gewisse Verantwortung. Schon ein kurzer Blick auf Herkunft, Datum und Zusammenhang kann verhindern, dass irreführende Aussagen ungeprüft verbreitet werden. Diese Gewohnheit braucht Zeit, stärkt jedoch langfristig einen sachlichen Austausch.',
  },
  {
    id: 'learning',
    title: 'Lernen ohne fertigen Plan',
    level: 3,
    text: 'Häufig stellen wir uns Lernen als geradlinigen Vorgang vor: Man setzt sich ein Ziel, übt regelmäßig und erreicht schließlich das gewünschte Ergebnis. Tatsächlich verläuft der Prozess meist weniger geordnet. Phasen sichtbaren Fortschritts wechseln sich mit Zeiten ab, in denen scheinbar nichts geschieht. Gerade dann ist es verlockend, die eigene Fähigkeit grundsätzlich infrage zu stellen. Dabei können solche Pausen darauf hinweisen, dass neue Kenntnisse erst miteinander verbunden werden müssen. Hilfreich ist es, Aufgaben gelegentlich zu verändern und frühere Versuche mit etwas Abstand erneut zu betrachten. Rückmeldungen sollten möglichst konkret sein, damit aus einem allgemeinen Gefühl des Scheiterns ein bearbeitbares Problem wird. Gleichzeitig darf die Freude am Ausprobieren nicht verloren gehen. Wer jeden Fehler ausschließlich als Bewertung seiner Person versteht, wird kaum Risiken eingehen. Nachhaltiges Lernen braucht daher sowohl anspruchsvolle Aufgaben als auch die Freiheit, vorübergehend unsicher zu sein.',
  },
];
export function passageById(id: string) {
  const passage = passages.find((p) => p.id === id);
  if (!passage) throw Error('Unknown passage. Choose a built-in passage.');
  return passage;
}
