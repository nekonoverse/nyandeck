import { For, Switch, Match } from "solid-js";
import { columns } from "../../stores/columns";
import Column from "./Column";
import Sidebar from "./Sidebar";
import TimelineColumn from "../columns/TimelineColumn";
import NotificationColumn from "../columns/NotificationColumn";
import MentionColumn from "../columns/MentionColumn";

export default function DeckLayout() {
  return (
    <div class="deck-layout">
      <Sidebar />
      <div class="deck-columns-area">
        <For each={columns()}>
          {(col, i) => (
            <Column id={col.id} type={col.type} index={i()}>
              <Switch>
                <Match when={col.type === "home"}>
                  <TimelineColumn mode="home" />
                </Match>
                <Match when={col.type === "public"}>
                  <TimelineColumn mode="public" />
                </Match>
                <Match when={col.type === "notifications"}>
                  <NotificationColumn />
                </Match>
                <Match when={col.type === "mentions"}>
                  <MentionColumn />
                </Match>
              </Switch>
            </Column>
          )}
        </For>
      </div>
    </div>
  );
}
